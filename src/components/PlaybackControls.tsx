/**
 * PlaybackControls Component
 * 
 * Provides playback controls including play/pause, speed, and segment controls
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaybackSpeed, AudioFormat } from '../types';
import { Play, Pause, Scissors, Flag, Plus, X } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  currentSegmentStart: number | null;
  currentSegmentEnd: number | null;
  duration: number;
  audioFormat: AudioFormat;
  baseFilename: string;
  onPlayPause: () => void;
  onSetStart: () => void;
  onSetEnd: () => void;
  onAddSegment: (name: string) => void;
  onPlaySegment: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onFormatChange: (format: AudioFormat) => void;
  onBaseFilenameChange: (filename: string) => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const FORMAT_OPTIONS: AudioFormat[] = ['wav', 'mp3', 'aac', 'flac', 'ogg'];

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  playbackSpeed,
  currentSegmentStart,
  currentSegmentEnd,
  duration,
  audioFormat,
  baseFilename,
  onPlayPause,
  onSetStart,
  onSetEnd,
  onAddSegment,
  onPlaySegment,
  onSpeedChange,
  onFormatChange,
  onBaseFilenameChange,
}) => {
  const { t } = useTranslation();
  const [segmentName, setSegmentName] = useState('');
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    onPlayPause();
  }, [onPlayPause]);

  // Handle set start
  const handleSetStart = useCallback(() => {
    onSetStart();
  }, [onSetStart]);

  // Handle set end
  const handleSetEnd = useCallback(() => {
    onSetEnd();
  }, [onSetEnd]);

  // Handle play segment
  const handlePlaySegment = useCallback(() => {
    if (currentSegmentStart !== null && currentSegmentEnd !== null) {
      onPlaySegment();
    }
  }, [currentSegmentStart, currentSegmentEnd, onPlaySegment]);

  // Handle add segment
  const handleAddSegment = useCallback(() => {
    if (segmentName.trim()) {
      onAddSegment(segmentName.trim());
      setSegmentName('');
    } else {
      onAddSegment(`Segment ${new Date().toLocaleTimeString()}`);
    }
  }, [segmentName, onAddSegment]);

  // Handle segment name change
  const handleSegmentNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSegmentName(e.target.value);
  }, []);

  // Handle segment name key down
  const handleSegmentNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddSegment();
    }
  }, [handleAddSegment]);

  // Handle base filename change
  const handleBaseFilenameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onBaseFilenameChange(e.target.value);
  }, [onBaseFilenameChange]);

  // Check if segment is valid
  const isSegmentValid = currentSegmentStart !== null && 
    currentSegmentEnd !== null && 
    currentSegmentEnd > currentSegmentStart;

  // Check if segment is set
  const isSegmentSet = currentSegmentStart !== null || currentSegmentEnd !== null;

  return (
    <div className="flex flex-wrap gap-2 items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!duration}
        title={isPlaying ? t('controls.pause') : t('controls.play')}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5" />
        )}
      </button>

      {/* Segment controls */}
      <div className="flex gap-1">
        <button
          onClick={handleSetStart}
          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!duration}
          title={t('tooltips.setStart')}
        >
          <Flag className="w-5 h-5" />
          <span className="sr-only">{t('controls.setStart')}</span>
        </button>

        <button
          onClick={handleSetEnd}
          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!duration}
          title={t('tooltips.setEnd')}
        >
          <Scissors className="w-5 h-5" />
          <span className="sr-only">{t('controls.setEnd')}</span>
        </button>
      </div>

      {/* Play segment button */}
      <button
        onClick={handlePlaySegment}
        className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isSegmentValid}
        title={t('tooltips.playSegment')}
      >
        <Play className="w-5 h-5" />
        <span className="sr-only">{t('controls.playSegment')}</span>
      </button>

      {/* Add segment */}
      <div className="flex gap-1">
        <input
          type="text"
          value={segmentName}
          onChange={handleSegmentNameChange}
          onKeyDown={handleSegmentNameKeyDown}
          placeholder={t('segments.name')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={!isSegmentValid}
        />
        <button
          onClick={handleAddSegment}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isSegmentValid}
          title={t('tooltips.addSegment')}
        >
          <Plus className="w-5 h-5" />
          <span className="sr-only">{t('controls.addSegment')}</span>
        </button>
      </div>

      {/* Clear segment selection */}
      {isSegmentSet && (
        <button
          onClick={() => {}}
          className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          title="Clear segment selection"
        >
          <X className="w-5 h-5" />
          <span className="sr-only">Clear</span>
        </button>
      )}

      {/* Speed control */}
      <div className="relative">
        <button
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
          className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-1"
        >
          <span className="text-sm font-medium">{playbackSpeed}x</span>
        </button>

        {showSpeedMenu && (
          <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 min-w-[120px]">
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  onSpeedChange(speed);
                  setShowSpeedMenu(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-primary-500 text-white dark:bg-primary-600'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('speed.options', { returnObjects: true })[speed.toString()]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Audio format control */}
      <div className="relative">
        <button
          onClick={() => setShowFormatMenu(!showFormatMenu)}
          className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-1"
        >
          <span className="text-sm font-medium">
            {t('audio.formats', { returnObjects: true })[audioFormat]}
          </span>
        </button>

        {showFormatMenu && (
          <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 min-w-[150px]">
            {FORMAT_OPTIONS.map((format) => (
              <button
                key={format}
                onClick={() => {
                  onFormatChange(format);
                  setShowFormatMenu(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  audioFormat === format
                    ? 'bg-primary-500 text-white dark:bg-primary-600'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('audio.formats', { returnObjects: true })[format]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Base filename input */}
      <div className="flex gap-1">
        <input
          type="text"
          value={baseFilename}
          onChange={handleBaseFilenameChange}
          placeholder={t('audio.baseFilename')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default PlaybackControls;
