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

import React, { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppState } from './hooks/useAppState';
import { initializeTheme, setTheme } from './utils/theme';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { PlaybackControls } from './components/PlaybackControls';
import { SegmentList } from './components/SegmentList';
import { SettingsPanel } from './components/SettingsPanel';
import { FileDropzone } from './components/FileDropzone';
import { VideoSegment, ExtractionStatus } from './types';
import { formatTime } from './utils/time';
import { extractAudioSegment, getVideoInfo, isFFmpegLoaded, getFFmpegLoadingStatus } from './services/ffmpegService';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

// Initialize theme on app load
initializeTheme();

const App: React.FC = () => {
  const { t } = useTranslation();
  const {
    state,
    setVideoFile,
    togglePlay,
    setPlaybackSpeed,
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
    createSegment,
  } = useAppState();

  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Initialize FFmpeg status
  useEffect(() => {
    setFfmpegLoading(getFFmpegLoadingStatus());
    setFfmpegLoaded(isFFmpegLoaded());
  }, []);

  // Sync theme with document
  useEffect(() => {
    setTheme(state.theme);
  }, [state.theme]);

  // Handle video time updates
  const handleTimeUpdate = useCallback((time: number) => {
    // Update current time in state
    // This is handled by the VideoPlayer component
  }, []);

  // Handle duration change
  const handleDurationChange = useCallback((duration: number) => {
    // Duration is updated by the VideoPlayer component
  }, []);

  // Handle seek
  const handleSeek = useCallback((time: number) => {
    // Seek is handled by the VideoPlayer component
  }, []);

  // Handle play segment
  const handlePlaySegment = useCallback((start: number, end: number) => {
    // This will be implemented in the VideoPlayer
    console.log(`Playing segment from ${formatTime(start)} to ${formatTime(end)}`);
  }, []);

  // Handle extract audio for a segment
  const handleExtractAudio = useCallback((segmentId: string) => {
    const segment = state.segments.find(s => s.id === segmentId);
    if (!segment || !state.videoFile) return;

    // Mark as processing
    updateSegmentStatus(segmentId, 'processing');

    // Start extraction
    extractAudioSegment(
      state.videoFile,
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
  }, [state.segments, state.videoFile, updateSegmentStatus, updateSegmentWithAudio, t]);

  // Handle download audio
  const handleDownloadAudio = useCallback((segment: VideoSegment) => {
    if (!segment.audioBlob) return;

    // Create download link
    const url = URL.createObjectURL(segment.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = segment.customFilename || 
      `${state.baseFilename}_${formatTime(segment.startTime).replace(/:/g, '-')}_to_${formatTime(segment.endTime).replace(/:/g, '-')}.${segment.audioFormat}`;
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
  }, [state.baseFilename, t]);

  // Handle update segment
  const handleUpdateSegment = useCallback((segment: VideoSegment) => {
    // Update segment in state
    // This is handled by the SegmentList component
  }, []);

  // Handle theme change
  const handleThemeChange = useCallback((theme: 'light' | 'dark' | 'system') => {
    setAppTheme(theme);
  }, [setAppTheme]);

  // Handle language change
  const handleLanguageChange = useCallback((language: 'en' | 'es' | 'pt') => {
    setLanguage(language);
  }, [setLanguage]);

  // Handle base filename change
  const handleBaseFilenameChange = useCallback((filename: string) => {
    setBaseFilename(filename);
  }, [setBaseFilename]);

  // Handle audio format change
  const handleAudioFormatChange = useCallback((format: 'wav' | 'mp3' | 'aac' | 'flac' | 'ogg') => {
    setAudioFormat(format);
  }, [setAudioFormat]);

  // Handle remove video file
  const handleRemoveVideo = useCallback(() => {
    setVideoFile(null);
  }, [setVideoFile]);

  // Check if we have a video loaded
  const hasVideo = state.videoUrl !== null;

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
            videoFile={state.videoFile}
            isLoading={state.isLoading}
          />
        </div>

        {/* Error message */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 dark:text-red-400">{state.error}</span>
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
                videoUrl={state.videoUrl}
                isPlaying={state.isPlaying}
                currentTime={state.currentTime}
                duration={state.duration}
                playbackSpeed={state.playbackSpeed}
                onTimeUpdate={(time) => {
                  // Update current time in state
                  // This is handled by the VideoPlayer component
                }}
                onDurationChange={(duration) => {
                  // Update duration in state
                }}
                onSeek={(time) => {
                  // Seek to time
                }}
                onPlayPause={togglePlay}
                onSegmentPlay={handlePlaySegment}
                onLoadedMetadata={(duration) => {
                  // Duration loaded
                }}
              />
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Timeline
                currentTime={state.currentTime}
                duration={state.duration}
                onSeek={(time) => {
                  // Update current time
                }}
                segments={state.segments}
                currentSegmentStart={state.currentSegmentStart}
                currentSegmentEnd={state.currentSegmentEnd}
                onSetStart={setSegmentStart}
                onSetEnd={setSegmentEnd}
              />
            </div>

            {/* Playback controls */}
            <PlaybackControls
              isPlaying={state.isPlaying}
              playbackSpeed={state.playbackSpeed}
              currentSegmentStart={state.currentSegmentStart}
              currentSegmentEnd={state.currentSegmentEnd}
              duration={state.duration}
              audioFormat={state.audioFormat}
              baseFilename={state.baseFilename}
              onPlayPause={togglePlay}
              onSetStart={setSegmentStart}
              onSetEnd={setSegmentEnd}
              onAddSegment={addSegment}
              onPlaySegment={() => {
                if (state.currentSegmentStart !== null && state.currentSegmentEnd !== null) {
                  handlePlaySegment(state.currentSegmentStart, state.currentSegmentEnd);
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
              segments={state.segments}
              videoFile={state.videoFile}
              baseFilename={state.baseFilename}
              onPlaySegment={handlePlaySegment}
              onExtractAudio={handleExtractAudio}
              onDownloadAudio={handleDownloadAudio}
              onDeleteSegment={deleteSegment}
              onUpdateSegment={(segment) => {
                // Update segment in state
                // This would need to be implemented in the state management
              }}
            />
          </div>
        </div>
      </main>

      {/* Settings panel */}
      <SettingsPanel
        theme={state.theme}
        language={state.language}
        baseFilename={state.baseFilename}
        audioFormat={state.audioFormat}
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
