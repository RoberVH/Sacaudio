/**
 * Main App Component
 * 
 * This is the root component that orchestrates all the functionality:
 * - Video loading and playback
 * - Timeline navigation
 * - Segment creation and management
 * - Audio extraction using FFmpeg WASM
 * - Theme and language settings
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { initializeTheme, setTheme } from './utils/theme';
import VideoPlayer, { VideoPlayerHandle } from './components/VideoPlayer';
import Timeline from './components/Timeline';
import PlaybackControls from './components/PlaybackControls';
import SegmentList from './components/SegmentList';
import SettingsPanel from './components/SettingsPanel';
import FileDropzone from './components/FileDropzone';
import { VideoSegment, AudioFormat, Theme, Language, PlaybackSpeed, ExtractionStatus } from './types';
import { formatTime } from './utils/time';
import { 
  extractAudioSegment, 
  getVideoInfo, 
  isFFmpegLoaded, 
  getFFmpegLoadingStatus,
  ffmpegService 
} from './services/ffmpegService';
import useAppStore from './store/useAppStore';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

// Initialize theme on app load
initializeTheme();

const App: React.FC = () => {
  const { t } = useTranslation();
  
  // Use Zustand store
  const {
    videoFile,
    videoUrl,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    segments,
    currentSegmentStart,
    currentSegmentEnd,
    baseFilename,
    audioFormat,
    theme,
    language,
    isLoading,
    error,
    setVideoFile,
    togglePlay,
    setPlaybackSpeed,
    setCurrentTime,
    setDuration,
    setSegmentStart,
    setSegmentEnd,
    addSegment,
    deleteSegment,
    setTheme: setAppTheme,
    setLanguage,
    setBaseFilename,
    setAudioFormat,
    updateSegmentFormat,
    updateSegmentName,
    updateSegmentCustomFilename,
    updateSegmentStatus,
    updateSegmentWithAudio,
    clearError,
    setLoading,
    resetSegmentSelection,
  } = useAppStore();

  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const videoRef = useRef<VideoPlayerHandle>(null);

  // Initialize FFmpeg status
  useEffect(() => {
    setFfmpegLoading(getFFmpegLoadingStatus());
    setFfmpegLoaded(isFFmpegLoaded());
    
    // Preload FFmpeg in background
    const timer = setTimeout(() => {
      ffmpegService.preloadFFmpeg();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Sync theme with document
  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  // Handle video time updates
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, [setCurrentTime]);

  // Handle duration change
  const handleDurationChange = useCallback((duration: number) => {
    setDuration(duration);
  }, [setDuration]);

  // Handle seek
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, [setCurrentTime]);

  // Handle play segment
  const handlePlaySegment = useCallback((start: number, end: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      videoRef.current.play().catch(error => {
        console.error('Error playing segment:', error);
      });

      // Set up event listener for segment end
      const handleSegmentEnd = () => {
        if (videoRef.current && videoRef.current.currentTime >= end) {
          videoRef.current.pause();
          videoRef.current.removeEventListener('timeupdate', handleSegmentEnd);
        }
      };

      videoRef.current.addEventListener('timeupdate', handleSegmentEnd);

      // Clean up after segment ends
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('timeupdate', handleSegmentEnd);
        }
      };
    }
  }, []);

  // Handle extract audio for a segment
  const handleExtractAudio = useCallback((segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment || !videoFile) return;

    // Mark as processing
    updateSegmentStatus(segmentId, 'processing');

    // Start extraction
    extractAudioSegment(
      videoFile,
      segment,
      (progress) => {
        console.log(`Extraction progress: ${progress}%`);
      },
      (audioBlob) => {
        // Extraction complete
        updateSegmentWithAudio(segmentId, audioBlob);
        
        // Show success notification
        setShowNotification({
          type: 'success',
          message: `${t('messages.extractionComplete')} - ${segment.name}`,
        });

        // Auto-hide notification after 3 seconds
        setTimeout(() => {
          setShowNotification(null);
        }, 3000);
      },
      (error) => {
        // Extraction failed
        updateSegmentStatus(segmentId, 'error', error);
        
        // Show error notification
        setShowNotification({
          type: 'error',
          message: `${t('messages.extractionFailed')} - ${segment.name}: ${error}`,
        });

        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowNotification(null);
        }, 5000);
      }
    );
  }, [segments, videoFile, updateSegmentStatus, updateSegmentWithAudio, t]);

  // Handle download audio
  const handleDownloadAudio = useCallback((segment: VideoSegment) => {
    if (!segment.audioBlob) return;

    // Create download link
    const url = URL.createObjectURL(segment.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = segment.customFilename || 
      `${baseFilename}_${formatTime(segment.startTime).replace(/:/g, '-')}_to_${formatTime(segment.endTime).replace(/:/g, '-')}.${segment.audioFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success notification
    setShowNotification({
      type: 'success',
      message: `${t('messages.fileSaved')} - ${segment.name}`,
    });

    setTimeout(() => {
      setShowNotification(null);
    }, 3000);
  }, [baseFilename, t]);

  // Handle theme change
  const handleThemeChange = useCallback((theme: Theme) => {
    setAppTheme(theme);
  }, [setAppTheme]);

  // Handle language change
  const handleLanguageChange = useCallback((language: Language) => {
    setLanguage(language);
  }, [setLanguage]);

  // Handle base filename change
  const handleBaseFilenameChange = useCallback((filename: string) => {
    setBaseFilename(filename);
  }, [setBaseFilename]);

  // Handle audio format change
  const handleAudioFormatChange = useCallback((format: AudioFormat) => {
    setAudioFormat(format);
  }, [setAudioFormat]);

  // Handle remove video file
  const handleRemoveVideo = useCallback(() => {
    setVideoFile(null);
  }, [setVideoFile]);

  // Check if we have a video loaded
  const hasVideo = videoUrl !== null;

  // Update FFmpeg loading status
  useEffect(() => {
    const interval = setInterval(() => {
      setFfmpegLoading(getFFmpegLoadingStatus());
      setFfmpegLoaded(isFFmpegLoaded());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Sacaudio
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('app.description')}
                </p>
              </div>
            </div>

            {/* FFmpeg loading indicator */}
            {ffmpegLoading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Loading FFmpeg...
                </span>
              </div>
            )}

            {ffmpegLoaded && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  FFmpeg Ready
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Notification */}
        {showNotification && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            showNotification.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : showNotification.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }`}>
            {showNotification.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {showNotification.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            {showNotification.type === 'info' && (
              <Info className="w-5 h-5 text-blue-500" />
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {showNotification.message}
            </span>
          </div>
        )}

        {/* File dropzone */}
        <div className="mb-6">
          <FileDropzone
            onFileSelect={setVideoFile}
            onFileRemove={handleRemoveVideo}
            videoFile={videoFile}
            isLoading={isLoading}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 dark:text-red-400">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Video player and controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video player */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <VideoPlayer
                ref={videoRef}
                videoUrl={videoUrl}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                playbackSpeed={playbackSpeed}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onSeek={handleSeek}
                onPlayPause={togglePlay}
                onSegmentPlay={handlePlaySegment}
                onLoadedMetadata={handleDurationChange}
              />
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Timeline
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                segments={segments}
                currentSegmentStart={currentSegmentStart}
                currentSegmentEnd={currentSegmentEnd}
                onSetStart={setSegmentStart}
                onSetEnd={setSegmentEnd}
              />
            </div>

            {/* Playback controls */}
            <PlaybackControls
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              currentSegmentStart={currentSegmentStart}
              currentSegmentEnd={currentSegmentEnd}
              duration={duration}
              audioFormat={audioFormat}
              baseFilename={baseFilename}
              onPlayPause={togglePlay}
              onSetStart={setSegmentStart}
              onSetEnd={setSegmentEnd}
              onAddSegment={addSegment}
              onPlaySegment={() => {
                if (currentSegmentStart !== null && currentSegmentEnd !== null) {
                  handlePlaySegment(currentSegmentStart, currentSegmentEnd);
                }
              }}
              onSpeedChange={setPlaybackSpeed}
              onFormatChange={handleAudioFormatChange}
              onBaseFilenameChange={handleBaseFilenameChange}
            />
          </div>

          {/* Right column - Segment list */}
          <div className="lg:col-span-1">
            <SegmentList
              segments={segments}
              videoFile={videoFile}
              baseFilename={baseFilename}
              onPlaySegment={handlePlaySegment}
              onExtractAudio={handleExtractAudio}
              onDownloadAudio={handleDownloadAudio}
              onDeleteSegment={deleteSegment}
              onUpdateSegment={updateSegmentName}
            />
          </div>
        </div>
      </main>

      {/* Settings panel */}
      <SettingsPanel
        theme={theme}
        language={language}
        baseFilename={baseFilename}
        audioFormat={audioFormat}
        onThemeChange={handleThemeChange}
        onLanguageChange={handleLanguageChange}
        onBaseFilenameChange={handleBaseFilenameChange}
        onAudioFormatChange={handleAudioFormatChange}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sacaudio - Video Segment Audio Extractor
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            All processing happens in your browser. No data is uploaded to any server.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
