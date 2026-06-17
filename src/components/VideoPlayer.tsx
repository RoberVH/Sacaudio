/**
 * VideoPlayer Component
 * 
 * Handles video playback, seeking, and time updates
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { VideoPlayerProps } from '../types';
import { formatTime, clamp } from '../utils/time';

interface VideoPlayerExtendedProps extends VideoPlayerProps {
  onLoadedMetadata: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerExtendedProps> = ({
  videoUrl,
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  onTimeUpdate,
  onDurationChange,
  onSeek,
  onPlayPause,
  onSegmentPlay,
  onLoadedMetadata,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle video time updates
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime;
      if (Math.abs(newTime - currentTime) > 0.1) {
        onTimeUpdate(newTime);
      }
    }
  }, [currentTime, onTimeUpdate]);

  // Handle duration change
  const handleDurationChange = useCallback(() => {
    if (videoRef.current) {
      const newDuration = videoRef.current.duration;
      if (newDuration && !isNaN(newDuration)) {
        onDurationChange(newDuration);
        onLoadedMetadata(newDuration);
      }
    }
  }, [onDurationChange, onLoadedMetadata]);

  // Handle video click for play/pause
  const handleVideoClick = useCallback(() => {
    onPlayPause();
  }, [onPlayPause]);

  // Handle video seek
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !containerRef.current || duration <= 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clamp(clickX / rect.width, 0, 1);
    const newTime = percentage * duration;
    
    videoRef.current.currentTime = newTime;
    onSeek(newTime);
  }, [duration, onSeek]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!videoRef.current) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        onPlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        videoRef.current.currentTime = Math.min(
          duration,
          videoRef.current.currentTime + 5
        );
        break;
    }
  }, [duration, onPlayPause]);

  // Sync video state with props
  useEffect(() => {
    if (!videoRef.current) return;

    // Sync play/pause state
    if (isPlaying) {
      videoRef.current.play().catch(error => {
        console.error('Error playing video:', error);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync current time
  useEffect(() => {
    if (!videoRef.current) return;
    
    // Only update if the difference is significant to avoid jitter
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync playback speed
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle video element mounting
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set initial time if duration is known
    if (duration > 0 && currentTime >= 0) {
      video.currentTime = currentTime;
    }
  }, [videoUrl, duration, currentTime]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  // Play a specific segment
  const playSegment = useCallback((start: number, end: number) => {
    if (!videoRef.current) return;

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

    // Clean up after segment ends or component unmounts
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('timeupdate', handleSegmentEnd);
      }
    };
  }, []);

  // Expose playSegment to parent via ref
  useEffect(() => {
    onSegmentPlay = playSegment;
  }, [playSegment]);

  if (!videoUrl) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No video loaded
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden cursor-pointer"
      onClick={handleVideoClick}
      onDoubleClick={handleSeek}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onClick={handleVideoClick}
        playsInline
        muted={false}
      />

      {/* Video overlay for better UX */}
      <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none" />

      {/* Current time and duration overlay */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Play/pause indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black bg-opacity-50 rounded-full p-4">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
