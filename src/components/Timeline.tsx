/**
 * Timeline Component
 * 
 * Provides a timeline slider for video navigation with segment markers
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { useRef, useEffect, useCallback, useState, memo } from 'react';
import { TimelineProps } from '../types';
import { formatTime, clamp } from '../utils/time';
import { useTranslation } from 'react-i18next';

interface TimelineExtendedProps extends TimelineProps {
  segments: Array<{
    id: string;
    startTime: number;
    endTime: number;
    name: string;
  }>;
  currentSegmentStart: number | null;
  currentSegmentEnd: number | null;
  onSetStart: () => void;
  onSetEnd: () => void;
}

// Memoize the Timeline component to prevent unnecessary re-renders
const TimelineComponent: React.FC<TimelineExtendedProps> = ({
  currentTime,
  duration,
  onSeek,
  segments,
  currentSegmentStart,
  currentSegmentEnd,
  onSetStart,
  onSetEnd,
}) => {
  const { t } = useTranslation();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Calculate position from time
  const timeToPosition = useCallback((time: number): number => {
    if (duration <= 0) return 0;
    return clamp((time / duration) * 100, 0, 100);
  }, [duration]);

  // Calculate time from position
  const positionToTime = useCallback((position: number): number => {
    if (duration <= 0) return 0;
    return clamp((position / 100) * duration, 0, duration);
  }, [duration]);

  // Handle timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clamp(clickX / rect.width, 0, 1);
    const newTime = percentage * duration;
    
    onSeek(newTime);
  }, [duration, onSeek]);

  // Handle mouse move for hover time
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentage = clamp(mouseX / rect.width, 0, 1);
    const newTime = percentage * duration;
    
    setHoverTime(newTime);
  }, [duration]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;

    setIsDragging(true);
    handleTimelineClick(e);
  }, [duration, handleTimelineClick]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse move while dragging
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current || duration <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentage = clamp(mouseX / rect.width, 0, 1);
    const newTime = percentage * duration;
    
    onSeek(newTime);
  }, [isDragging, duration, onSeek]);

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleMouseUp]);

  // Handle keyboard shortcuts for timeline
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Current position percentage
  const currentPosition = timeToPosition(currentTime);

  // Segment start and end positions
  const startPosition = currentSegmentStart !== null ? timeToPosition(currentSegmentStart) : null;
  const endPosition = currentSegmentEnd !== null ? timeToPosition(currentSegmentEnd) : null;

  // Hover position
  const hoverPosition = hoverTime !== null ? timeToPosition(hoverTime) : null;

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-lg p-2">
      {/* Timeline track */}
      <div
        ref={timelineRef}
        className="relative h-6 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer"
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      >
        {/* Timeline background */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-20" />
        </div>

        {/* Segment markers */}
        {segments.map((segment) => {
          const segmentStartPos = timeToPosition(segment.startTime);
          const segmentEndPos = timeToPosition(segment.endTime);
          const segmentWidth = segmentEndPos - segmentStartPos;

          // Only render if segment is visible
          if (segmentWidth <= 0) return null;

          return (
            <div
              key={segment.id}
              className="absolute h-full bg-blue-500 opacity-60 rounded-full"
              style={{
                left: `${segmentStartPos}%`,
                width: `${segmentWidth}%`,
              }}
              title={`${segment.name}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
            />
          );
        })}

        {/* Current segment selection */}
        {startPosition !== null && endPosition !== null && endPosition > startPosition && (
          <div
            className="absolute h-full bg-blue-400 opacity-80 rounded-full border-2 border-white"
            style={{
              left: `${startPosition}%`,
              width: `${endPosition - startPosition}%`,
            }}
          />
        )}

        {/* Current position indicator */}
        <div
          className="absolute top-1/2 left-0 transform -translate-y-1/2 w-1 h-6 bg-white border-2 border-blue-500 rounded-full shadow-lg"
          style={{
            left: `${currentPosition}%`,
            transform: `translate(-50%, -50%)`,
          }}
        />

        {/* Hover preview */}
        {hoverPosition !== null && (
          <div
            className="absolute top-0 left-0 transform -translate-x-1/2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
            style={{
              left: `${hoverPosition}%`,
              transform: `translateX(-50%) translateY(-100%)`,
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{formatTime(0)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Current time display */}
      <div className="text-center mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('timeline.currentTime', { time: formatTime(currentTime) })}
        {duration > 0 && (
          <>
            {' / '}
            {t('timeline.duration', { time: formatTime(duration) })}
          </>
        )}
      </div>

      {/* Segment time display */}
      {(currentSegmentStart !== null || currentSegmentEnd !== null) && (
        <div className="text-center mt-1 text-xs text-gray-500 dark:text-gray-400">
          {currentSegmentStart !== null && (
            <span>
              {t('timeline.segmentStart', { time: formatTime(currentSegmentStart) })}
            </span>
          )}
          {currentSegmentStart !== null && currentSegmentEnd !== null && (
            <span> - </span>
          )}
          {currentSegmentEnd !== null && (
            <span>
              {t('timeline.segmentEnd', { time: formatTime(currentSegmentEnd) })}
            </span>
          )}
          {currentSegmentStart !== null && currentSegmentEnd !== null && (
            <span>
              {' ('}
              {t('timeline.segmentDuration', {
                time: formatTime(currentSegmentEnd - currentSegmentStart),
              })}
              {')'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Export memoized component
const Timeline = memo(TimelineComponent);
Timeline.displayName = 'Timeline';

export default Timeline;
