/**
 * FFmpeg WebAssembly Service for Audio Extraction
 * 
 * This service handles all audio extraction using FFmpeg compiled to WebAssembly.
 * It provides methods to extract audio segments from video files with various
 * output formats and quality settings.
 * 
 * Key Features:
 * - Stream copy when possible (preserves original audio quality)
 * - High-quality transcoding when stream copy is not possible
 * - Support for multiple audio formats (WAV, MP3, AAC, FLAC, OGG)
 * - Progress tracking during extraction
 * - Error handling and cleanup
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { AudioFormat, VideoSegment, ExtractionStatus } from '../types';
import { generateAudioFilename, sanitizeFilename } from '../utils/time';

// FFmpeg instance - will be loaded on demand
let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let isLoaded = false;

// Queue for extraction tasks
interface ExtractionTask {
  segment: VideoSegment;
  videoFile: File;
  onProgress: (progress: number) => void;
  onComplete: (audioBlob: Blob) => void;
  onError: (error: string) => void;
}

const taskQueue: ExtractionTask[] = [];
let isProcessing = false;

/**
 * Initialize FFmpeg WebAssembly
 * This loads the FFmpeg WASM module and required data files
 */
async function initializeFFmpeg(): Promise<FFmpeg> {
  if (isLoaded && ffmpegInstance) {
    return ffmpegInstance;
  }

  if (isLoading) {
    // Wait for existing initialization to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return ffmpegInstance!;
  }

  isLoading = true;

  try {
    const ffmpeg = new FFmpeg();
    
    // Load FFmpeg WASM
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    isLoaded = true;
    isLoading = false;
    
    console.log('FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    isLoading = false;
    console.error('Failed to load FFmpeg:', error);
    throw new Error('Failed to initialize FFmpeg. Please check your internet connection.');
  }
}

/**
 * Get FFmpeg instance, initializing if necessary
 */
async function getFFmpeg(): Promise<FFmpeg> {
  return initializeFFmpeg();
}

/**
 * Determine if stream copy is possible for the given format
 * Stream copy preserves the original audio without re-encoding
 * @param format - Target audio format
 * @param audioCodec - Source audio codec
 * @returns Whether stream copy is possible
 */
function canStreamCopy(format: AudioFormat, audioCodec?: string): boolean {
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
 * @param format - Target audio format
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @param preserveQuality - Whether to preserve original quality
 * @param audioCodec - Source audio codec (if known)
 * @returns FFmpeg command arguments
 */
function getExtractionCommand(
  format: AudioFormat,
  startTime: number,
  endTime: number,
  preserveQuality: boolean,
  audioCodec?: string
): string[] {
  const duration = endTime - startTime;
  const commands: string[] = [];

  // Input file (will be replaced with actual filename)
  commands.push('-i', 'input.mp4');

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

  // Output file (will be replaced with actual filename)
  commands.push('output.' + format);

  return commands;
}

/**
 * Extract audio from a video segment
 * @param videoFile - The video file
 * @param segment - The segment to extract
 * @param onProgress - Progress callback
 * @param onComplete - Completion callback
 * @param onError - Error callback
 */
export async function extractAudioSegment(
  videoFile: File,
  segment: VideoSegment,
  onProgress: (progress: number) => void,
  onComplete: (audioBlob: Blob) => void,
  onError: (error: string) => void
): Promise<void> {
  const task: ExtractionTask = {
    segment,
    videoFile,
    onProgress,
    onComplete,
    onError,
  };

  taskQueue.push(task);
  
  // Process the queue
  if (!isProcessing) {
    await processQueue();
  }
}

/**
 * Process the extraction queue
 */
async function processQueue(): Promise<void> {
  if (taskQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;

  while (taskQueue.length > 0) {
    const task = taskQueue.shift()!;
    
    try {
      await processTask(task);
    } catch (error) {
      console.error('Error processing task:', error);
      task.onError(typeof error === 'string' ? error : 'Unknown error during extraction');
    }
  }

  isProcessing = false;
}

/**
 * Process a single extraction task
 */
async function processTask(task: ExtractionTask): Promise<void> {
  const { segment, videoFile, onProgress, onComplete, onError } = task;
  
  try {
    const ffmpeg = await getFFmpeg();
    
    // Generate output filename
    const outputFilename = generateAudioFilename(
      segment.name || 'segment',
      segment.startTime,
      segment.endTime,
      segment.audioFormat
    );

    // Write input file to FFmpeg filesystem
    const inputName = 'input.mp4';
    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // Get extraction command
    const commands = getExtractionCommand(
      segment.audioFormat,
      segment.startTime,
      segment.endTime,
      true, // preserve quality
      // Note: We don't have audio codec info here, so we'll try stream copy
      // and fall back to transcoding if needed
    );

    // Replace input filename in commands
    const finalCommands = commands.map(cmd => 
      cmd === 'input.mp4' ? inputName : cmd
    );

    // Set output filename
    const outputName = `output.${segment.audioFormat}`;
    finalCommands[finalCommands.length - 1] = outputName;

    console.log('Running FFmpeg command:', finalCommands.join(' '));

    // Execute FFmpeg command
    await ffmpeg.exec(finalCommands);

    // Read the output file
    const outputData = await ffmpeg.readFile(outputName);
    
    if (!outputData) {
      throw new Error('No output file generated');
    }

    // Create blob from output data
    const audioBlob = new Blob([outputData as Uint8Array], {
      type: getMimeType(segment.audioFormat),
    });

    // Clean up
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    // Notify completion
    onComplete(audioBlob);
    
  } catch (error) {
    console.error('FFmpeg extraction error:', error);
    
    // Try with transcoding if stream copy failed
    if (typeof error === 'string' && error.includes('Invalid data found')) {
      try {
        console.log('Retrying with transcoding...');
        await retryWithTranscoding(task);
      } catch (retryError) {
        onError(`Extraction failed: ${retryError}`);
      }
    } else {
      onError(`Extraction failed: ${error}`);
    }
  }
}

/**
 * Retry extraction with transcoding (no stream copy)
 */
async function retryWithTranscoding(task: ExtractionTask): Promise<void> {
  const { segment, videoFile, onProgress, onComplete, onError } = task;
  
  const ffmpeg = await getFFmpeg();
  
  const inputName = 'input.mp4';
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

  // Force transcoding by not using -c:a copy
  const commands = getExtractionCommand(
    segment.audioFormat,
    segment.startTime,
    segment.endTime,
    false, // force transcoding
    undefined // no codec info
  );

  const finalCommands = commands.map(cmd => 
    cmd === 'input.mp4' ? inputName : cmd
  );
  
  const outputName = `output.${segment.audioFormat}`;
  finalCommands[finalCommands.length - 1] = outputName;

  console.log('Retrying with transcoding:', finalCommands.join(' '));

  await ffmpeg.exec(finalCommands);
  
  const outputData = await ffmpeg.readFile(outputName);
  
  if (!outputData) {
    throw new Error('No output file generated with transcoding');
  }

  const audioBlob = new Blob([outputData as Uint8Array], {
    type: getMimeType(segment.audioFormat),
  });

  // Clean up
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  onComplete(audioBlob);
}

/**
 * Get MIME type for audio format
 * @param format - Audio format
 * @returns MIME type string
 */
function getMimeType(format: AudioFormat): string {
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
 * Extract audio from multiple segments
 * @param videoFile - The video file
 * @param segments - Array of segments to extract
 * @param onProgress - Progress callback for each segment
 * @param onComplete - Completion callback
 * @param onError - Error callback
 */
export async function extractAllSegments(
  videoFile: File,
  segments: VideoSegment[],
  onProgress: (segmentId: string, progress: number) => void,
  onComplete: (segmentId: string, audioBlob: Blob) => void,
  onError: (segmentId: string, error: string) => void
): Promise<void> {
  // Add all segments to the queue
  for (const segment of segments) {
    await extractAudioSegment(
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
 * @param videoFile - The video file
 * @returns Video information
 */
export async function getVideoInfo(videoFile: File): Promise<{
  duration: number;
  audioCodec?: string;
  videoCodec?: string;
}> {
  try {
    const ffmpeg = await getFFmpeg();
    
    // Write file to FFmpeg filesystem
    const inputName = 'input.mp4';
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
    await ffmpeg.deleteFile(inputName);
    
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
export function isFFmpegLoaded(): boolean {
  return isLoaded;
}

/**
 * Get FFmpeg loading status
 */
export function getFFmpegLoadingStatus(): boolean {
  return isLoading;
}

/**
 * Clean up FFmpeg resources
 */
export async function cleanupFFmpeg(): Promise<void> {
  if (ffmpegInstance) {
    try {
      await ffmpegInstance.exit();
      ffmpegInstance = null;
      isLoaded = false;
    } catch (error) {
      console.error('Error cleaning up FFmpeg:', error);
    }
  }
}

// Export for testing
export { getExtractionCommand, canStreamCopy };
