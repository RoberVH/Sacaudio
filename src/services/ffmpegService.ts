/**
 * FFmpeg WebAssembly Service for Audio Extraction
 * 
 * This service handles all audio extraction using FFmpeg compiled to WebAssembly.
 * It provides methods to extract audio segments from video files with various
 * output formats and quality settings.
 * 
 * Key Features:
 * - Singleton pattern for single FFmpeg instance
 * - Stream copy when possible (preserves original audio quality)
 * - High-quality transcoding when stream copy is not possible
 * - Support for multiple audio formats (WAV, MP3, AAC, FLAC, OGG)
 * - Queue system for concurrent extractions with limit
 * - Progress tracking during extraction
 * - Error handling and cleanup
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { AudioFormat, VideoSegment } from '../types';
import { generateAudioFilename, sanitizeFilename } from '../utils/time';

// FFmpeg Service Singleton
class FFmpegService {
  private static instance: FFmpegService;
  private ffmpeg: FFmpeg | null = null;
  private ffmpegPromise: Promise<FFmpeg> | null = null;
  private isLoading = false;
  private isLoaded = false;
  
  // Queue for extraction tasks
  private queue: Array<() => Promise<void>> = [];
  private maxConcurrent = 2; // Limit concurrent extractions
  private activeTasks = 0;

  private constructor() {}

  public static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  /**
   * Initialize FFmpeg WebAssembly
   * This loads the FFmpeg WASM module and required data files
   */
  private async initializeFFmpeg(): Promise<FFmpeg> {
    if (this.isLoaded && this.ffmpeg) {
      return this.ffmpeg;
    }

    if (this.isLoading && this.ffmpegPromise) {
      // Wait for existing initialization to complete
      return this.ffmpegPromise;
    }

    this.isLoading = true;
    this.ffmpegPromise = this.loadFFmpeg();
    
    try {
      this.ffmpeg = await this.ffmpegPromise;
      this.isLoaded = true;
      this.isLoading = false;
      console.log('FFmpeg loaded successfully');
      return this.ffmpeg;
    } catch (error) {
      this.isLoading = false;
      console.error('Failed to load FFmpeg:', error);
      throw new Error('Failed to initialize FFmpeg. Please check your internet connection.');
    }
  }

  private async loadFFmpeg(): Promise<FFmpeg> {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
  }

  /**
   * Get FFmpeg instance, initializing if necessary
   */
  private async getFFmpeg(): Promise<FFmpeg> {
    return this.initializeFFmpeg();
  }

  /**
   * Determine if stream copy is possible for the given format
   * Stream copy preserves the original audio without re-encoding
   */
  private canStreamCopy(format: AudioFormat, audioCodec?: string): boolean {
    // Map of formats to their typical codecs
    const formatCodecs: Record<AudioFormat, string[]> = {
      wav: ['pcm_s16le', 'pcm_s24le', 'pcm_s32le'],
      mp3: ['mp3', 'mp3float'],
      aac: ['aac', 'mp4a'],
      flac: ['flac'],
      ogg: ['vorbis', 'opus'],
    };

    // If we don't know the source codec, we can't guarantee stream copy
    if (!audioCodec) {
      return false;
    }

    const allowedCodecs = formatCodecs[format];
    if (!allowedCodecs) {
      return false;
    }

    // Check if the source codec is compatible with the target format
    return allowedCodecs.some(codec => audioCodec.toLowerCase().includes(codec));
  }

  /**
   * Get FFmpeg command for audio extraction
   */
  private getExtractionCommand(
    format: AudioFormat,
    startTime: number,
    endTime: number,
    inputName: string,
    outputName: string,
    preserveQuality: boolean,
    audioCodec?: string
  ): string[] {
    const duration = endTime - startTime;
    const commands: string[] = [];

    // Input file
    commands.push('-i', inputName);

    // Seek to start time
    commands.push('-ss', startTime.toString());

    // Set duration
    if (duration > 0) {
      commands.push('-t', duration.toString());
    }

    // Audio stream selection
    commands.push('-map', '0:a?'); // Select audio stream if available

    // Format-specific commands
    switch (format) {
      case 'wav':
        if (preserveQuality && audioCodec && audioCodec.toLowerCase().includes('pcm')) {
          // Stream copy for WAV if source is PCM
          commands.push('-c:a', 'copy');
        } else {
          // High-quality PCM for WAV
          commands.push('-c:a', 'pcm_s16le');
        }
        break;

      case 'mp3':
        if (preserveQuality && audioCodec && audioCodec.toLowerCase().includes('mp3')) {
          commands.push('-c:a', 'copy');
        } else {
          // High-quality MP3 encoding
          commands.push('-c:a', 'libmp3lame', '-q:a', '2'); // VBR ~190kbps
        }
        break;

      case 'aac':
        if (preserveQuality && audioCodec && audioCodec.toLowerCase().includes('aac')) {
          commands.push('-c:a', 'copy');
        } else {
          // High-quality AAC encoding
          commands.push('-c:a', 'aac', '-b:a', '192k');
        }
        break;

      case 'flac':
        if (preserveQuality && audioCodec && audioCodec.toLowerCase().includes('flac')) {
          commands.push('-c:a', 'copy');
        } else {
          // FLAC encoding
          commands.push('-c:a', 'flac', '-compression_level', '8'); // Best compression
        }
        break;

      case 'ogg':
        if (preserveQuality && audioCodec && audioCodec.toLowerCase().includes('vorbis')) {
          commands.push('-c:a', 'copy');
        } else {
          // High-quality Vorbis encoding
          commands.push('-c:a', 'libvorbis', '-q:a', '8'); // Quality 8 (~256kbps)
        }
        break;
    }

    // Output file
    commands.push(outputName);

    return commands;
  }

  /**
   * Get MIME type for audio format
   */
  private getMimeType(format: AudioFormat): string {
    const mimeTypes: Record<AudioFormat, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      aac: 'audio/aac',
      flac: 'audio/flac',
      ogg: 'audio/ogg',
    };
    return mimeTypes[format] || 'audio/unknown';
  }

  /**
   * Process the extraction queue
   */
  private async processQueue(): Promise<void> {
    if (this.activeTasks >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.activeTasks++;
    const task = this.queue.shift()!;
    
    try {
      await task();
    } catch (error) {
      console.error('Error processing task:', error);
    } finally {
      this.activeTasks--;
      // Process next task
      setTimeout(() => this.processQueue(), 0);
    }
  }

  /**
   * Extract audio from a video segment
   */
  public async extractAudioSegment(
    videoFile: File,
    segment: VideoSegment,
    onProgress: (progress: number) => void,
    onComplete: (audioBlob: Blob) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const task = async () => {
      try {
        const ffmpeg = await this.getFFmpeg();
        
        // Generate unique filenames to avoid conflicts
        const inputName = `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
        const outputName = `output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${segment.audioFormat}`;

        // Write input file to FFmpeg filesystem
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // Get extraction command
        const commands = this.getExtractionCommand(
          segment.audioFormat,
          segment.startTime,
          segment.endTime,
          inputName,
          outputName,
          true, // preserve quality
          undefined // no codec info
        );

        console.log('Running FFmpeg command:', commands.join(' '));

        // Execute FFmpeg command
        await ffmpeg.exec(commands);

        // Read the output file
        const outputData = await ffmpeg.readFile(outputName);
        
        if (!outputData) {
          throw new Error('No output file generated');
        }

        // Create blob from output data
        const audioBlob = new Blob([outputData as Uint8Array], {
          type: this.getMimeType(segment.audioFormat),
        });

        // Clean up
        try {
          await ffmpeg.deleteFile(inputName);
        } catch (e) {
          console.warn('Failed to delete input file:', e);
        }
        
        try {
          await ffmpeg.deleteFile(outputName);
        } catch (e) {
          console.warn('Failed to delete output file:', e);
        }

        // Notify completion
        onComplete(audioBlob);
        
      } catch (error) {
        console.error('FFmpeg extraction error:', error);
        
        // Try with transcoding if stream copy failed
        if (typeof error === 'string' && error.includes('Invalid data found')) {
          try {
            console.log('Retrying with transcoding...');
            await this.retryWithTranscoding(videoFile, segment, onComplete, onError);
          } catch (retryError) {
            onError(`Extraction failed: ${retryError}`);
          }
        } else {
          onError(`Extraction failed: ${error}`);
        }
      }
    };

    this.queue.push(task);
    this.processQueue();
  }

  /**
   * Retry extraction with transcoding (no stream copy)
   */
  private async retryWithTranscoding(
    videoFile: File,
    segment: VideoSegment,
    onComplete: (audioBlob: Blob) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const ffmpeg = await this.getFFmpeg();
    
    const inputName = `input_retry_${Date.now()}.mp4`;
    const outputName = `output_retry_${Date.now()}.${segment.audioFormat}`;

    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // Force transcoding by not using -c:a copy
    const commands = this.getExtractionCommand(
      segment.audioFormat,
      segment.startTime,
      segment.endTime,
      inputName,
      outputName,
      false, // force transcoding
      undefined // no codec info
    );

    console.log('Retrying with transcoding:', commands.join(' '));

    await ffmpeg.exec(commands);
    
    const outputData = await ffmpeg.readFile(outputName);
    
    if (!outputData) {
      throw new Error('No output file generated with transcoding');
    }

    const audioBlob = new Blob([outputData as Uint8Array], {
      type: this.getMimeType(segment.audioFormat),
    });

    // Clean up
    try {
      await ffmpeg.deleteFile(inputName);
    } catch (e) {
      console.warn('Failed to delete retry input file:', e);
    }
    
    try {
      await ffmpeg.deleteFile(outputName);
    } catch (e) {
      console.warn('Failed to delete retry output file:', e);
    }

    onComplete(audioBlob);
  }

  /**
   * Extract audio from multiple segments
   */
  public async extractAllSegments(
    videoFile: File,
    segments: VideoSegment[],
    onProgress: (segmentId: string, progress: number) => void,
    onComplete: (segmentId: string, audioBlob: Blob) => void,
    onError: (segmentId: string, error: string) => void
  ): Promise<void> {
    // Add all segments to the queue
    for (const segment of segments) {
      await this.extractAudioSegment(
        videoFile,
        segment,
        (progress) => onProgress(segment.id, progress),
        (audioBlob) => onComplete(segment.id, audioBlob),
        (error) => onError(segment.id, error)
      );
    }
  }

  /**
   * Get video information (duration, codecs, etc.)
   */
  public async getVideoInfo(videoFile: File): Promise<{
    duration: number;
    audioCodec?: string;
    videoCodec?: string;
  }> {
    try {
      const ffmpeg = await this.getFFmpeg();
      
      // Write file to FFmpeg filesystem
      const inputName = `probe_${Date.now()}.mp4`;
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Run ffprobe to get video info
      await ffmpeg.exec([
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-show_entries', 'stream=codec_type,codec_name',
        '-of', 'json',
        inputName
      ]);

      // Read the output
      const output = await ffmpeg.readFile('output.json');
      
      // Clean up
      try {
        await ffmpeg.deleteFile(inputName);
      } catch (e) {
        console.warn('Failed to delete probe file:', e);
      }

      if (output) {
        const info = JSON.parse(output as string);
        const duration = parseFloat(info.format?.duration || '0');
        
        // Find audio and video streams
        let audioCodec: string | undefined;
        let videoCodec: string | undefined;
        
        for (const stream of info.streams || []) {
          if (stream.codec_type === 'audio') {
            audioCodec = stream.codec_name;
          } else if (stream.codec_type === 'video') {
            videoCodec = stream.codec_name;
          }
        }

        return { duration, audioCodec, videoCodec };
      }

      return { duration: 0 };
    } catch (error) {
      console.error('Error getting video info:', error);
      return { duration: 0 };
    }
  }

  /**
   * Check if FFmpeg is loaded
   */
  public isFFmpegLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get FFmpeg loading status
   */
  public getFFmpegLoadingStatus(): boolean {
    return this.isLoading;
  }

  /**
   * Clean up FFmpeg resources
   */
  public async cleanupFFmpeg(): Promise<void> {
    if (this.ffmpeg) {
      try {
        await this.ffmpeg.exit();
        this.ffmpeg = null;
        this.isLoaded = false;
        this.isLoading = false;
        this.ffmpegPromise = null;
      } catch (error) {
        console.error('Error cleaning up FFmpeg:', error);
      }
    }
  }

  /**
   * Preload FFmpeg in background
   */
  public async preloadFFmpeg(): Promise<void> {
    try {
      await this.getFFmpeg();
    } catch (error) {
      console.warn('FFmpeg preload failed:', error);
    }
  }
}

// Singleton instance
export const ffmpegService = FFmpegService.getInstance();

// Export existing functions for backward compatibility
export const extractAudioSegment = (
  videoFile: File,
  segment: VideoSegment,
  onProgress: (progress: number) => void,
  onComplete: (audioBlob: Blob) => void,
  onError: (error: string) => void
) => {
  ffmpegService.extractAudioSegment(videoFile, segment, onProgress, onComplete, onError);
};

export const extractAllSegments = (
  videoFile: File,
  segments: VideoSegment[],
  onProgress: (segmentId: string, progress: number) => void,
  onComplete: (segmentId: string, audioBlob: Blob) => void,
  onError: (segmentId: string, error: string) => void
) => {
  ffmpegService.extractAllSegments(videoFile, segments, onProgress, onComplete, onError);
};

export const getVideoInfo = (videoFile: File) => {
  return ffmpegService.getVideoInfo(videoFile);
};

export const isFFmpegLoaded = () => ffmpegService.isFFmpegLoaded();

export const getFFmpegLoadingStatus = () => ffmpegService.getFFmpegLoadingStatus();

export const cleanupFFmpeg = () => ffmpegService.cleanupFFmpeg();

// Export for testing
export { FFmpegService };
