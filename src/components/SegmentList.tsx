/**
 * SegmentList Component
 * 
 * Displays the list of segments with their status and provides controls
 * for each segment (play, extract, download, delete)
 * Optimized with React.memo and includes progress bar for extraction
 */

import React, { useCallback, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { VideoSegment, ExtractionStatus } from '../types';
import { formatTime, generateAudioFilename, sanitizeFilename } from '../utils/time';
import { Play, Pause, Download, Trash2, AlertCircle, Clock, CheckCircle, XCircle, Edit2, Save } from 'lucide-react';
import { extractAudioSegment } from '../services/ffmpegService';

interface SegmentListProps {
  segments: VideoSegment[];
  videoFile: File | null;
  baseFilename: string;
  onPlaySegment: (start: number, end: number) => void;
  onExtractAudio: (segmentId: string) => void;
  onDownloadAudio: (segment: VideoSegment) => void;
  onDeleteSegment: (segmentId: string) => void;
  onUpdateSegment: (segment: VideoSegment) => void;
}

// Memoize individual segment row to prevent unnecessary re-renders
interface SegmentRowProps {
  segment: VideoSegment;
  videoFile: File | null;
  baseFilename: string;
  onPlaySegment: (start: number, end: number) => void;
  onExtractAudio: (segmentId: string) => void;
  onDownloadAudio: (segment: VideoSegment) => void;
  onDeleteSegment: (segmentId: string) => void;
  onUpdateSegment: (segment: VideoSegment) => void;
  getStatusInfo: (status: ExtractionStatus) => {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    label: string;
  };
}

const SegmentRow: React.FC<SegmentRowProps> = memo(({
  segment,
  videoFile,
  baseFilename,
  onPlaySegment,
  onExtractAudio,
  onDownloadAudio,
  onDeleteSegment,
  onUpdateSegment,
  getStatusInfo,
}) => {
  const { t } = useTranslation();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  const statusInfo = getStatusInfo(segment.status);
  const duration = segment.endTime - segment.startTime;

  // Handle extract audio for this segment
  const handleExtractAudio = useCallback(() => {
    if (!videoFile) {
      console.error('No video file available for extraction');
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);
    onUpdateSegment({ ...segment, status: 'processing' });

    // Start extraction
    extractAudioSegment(
      videoFile,
      segment,
      (progress) => {
        setExtractionProgress(progress);
      },
      (audioBlob) => {
        setIsExtracting(false);
        setExtractionProgress(100);
        
        // Update segment with audio blob
        const updatedSegment: VideoSegment = {
          ...segment,
          audioBlob,
          audioUrl: URL.createObjectURL(audioBlob),
          status: 'ready',
          errorMessage: undefined,
        };
        onUpdateSegment(updatedSegment);
      },
      (error) => {
        setIsExtracting(false);
        const updatedSegment: VideoSegment = {
          ...segment,
          status: 'error',
          errorMessage: error,
        };
        onUpdateSegment(updatedSegment);
      }
    );
  }, [videoFile, segment, onUpdateSegment]);

  // Handle download audio
  const handleDownloadAudio = useCallback(() => {
    if (!segment.audioBlob) {
      console.error('No audio blob available for download');
      return;
    }

    // Generate filename
    const filename = segment.customFilename ||
      generateAudioFilename(
        baseFilename,
        segment.startTime,
        segment.endTime,
        segment.audioFormat
      );

    const sanitizedFilename = sanitizeFilename(filename);

    // Create download link
    const url = URL.createObjectURL(segment.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Notify parent
    onDownloadAudio(segment);
  }, [baseFilename, segment, onDownloadAudio]);

  // Handle delete segment
  const handleDeleteSegment = useCallback(() => {
    if (window.confirm(t('segments.confirmDelete'))) {
      onDeleteSegment(segment.id);
    }
  }, [t, segment.id, onDeleteSegment]);

  // Handle play segment
  const handlePlaySegment = useCallback(() => {
    onPlaySegment(segment.startTime, segment.endTime);
  }, [onPlaySegment, segment.startTime, segment.endTime]);

  return (
    <tr key={segment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {segment.name}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatTime(segment.startTime)}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatTime(segment.endTime)}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatTime(duration)}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {t('audio.formats', { returnObjects: true })[segment.audioFormat]}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
          {statusInfo.icon}
          <span className="ml-1">{statusInfo.label}</span>
        </span>
        {/* Progress bar for processing segments */}
        {segment.status === 'processing' && (
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-200"
              style={{ width: `${extractionProgress}%` }}
            />
          </div>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <div className="flex gap-1">
          {/* Play segment */}
          <button
            onClick={handlePlaySegment}
            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
            title={t('tooltips.playSegment')}
          >
            <Play className="w-4 h-4" />
          </button>

          {/* Extract audio */}
          <button
            onClick={handleExtractAudio}
            disabled={segment.status === 'processing' || isExtracting}
            className="p-1 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltips.extractAudio')}
          >
            {segment.status === 'processing' || isExtracting ? (
              <AlertCircle className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>

          {/* Download audio */}
          <button
            onClick={handleDownloadAudio}
            disabled={segment.status !== 'ready' || !segment.audioBlob}
            className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltips.download')}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Delete segment */}
          <button
            onClick={handleDeleteSegment}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
            title={t('tooltips.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

SegmentRow.displayName = 'SegmentRow';

// Memoize the main SegmentList component
const SegmentListComponent: React.FC<SegmentListProps> = ({
  segments,
  videoFile,
  baseFilename,
  onPlaySegment,
  onExtractAudio,
  onDownloadAudio,
  onDeleteSegment,
  onUpdateSegment,
}) => {
  const { t } = useTranslation();

  // Get status icon and color
  const getStatusInfo = useCallback((status: ExtractionStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          label: t('segments.statuses.pending'),
        };
      case 'processing':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100 dark:bg-blue-900',
          label: t('segments.statuses.processing'),
        };
      case 'ready':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-100 dark:bg-green-900',
          label: t('segments.statuses.ready'),
        };
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-100 dark:bg-red-900',
          label: t('segments.statuses.error'),
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          label: t('segments.statuses.pending'),
        };
    }
  }, [t]);

  // Sort segments by start time
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

  if (sortedSegments.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t('segments.empty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('segments.title')}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('segments.name')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('segments.start')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('segments.end')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('segments.duration')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('segments.format')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('segments.status')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('segments.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedSegments.map((segment) => (
              <SegmentRow
                key={segment.id}
                segment={segment}
                videoFile={videoFile}
                baseFilename={baseFilename}
                onPlaySegment={onPlaySegment}
                onExtractAudio={onExtractAudio}
                onDownloadAudio={onDownloadAudio}
                onDeleteSegment={onDeleteSegment}
                onUpdateSegment={onUpdateSegment}
                getStatusInfo={getStatusInfo}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Compare props to prevent unnecessary re-renders
const arePropsEqual = (prevProps: SegmentListProps, nextProps: SegmentListProps) => {
  return (
    prevProps.segments === nextProps.segments &&
    prevProps.videoFile === nextProps.videoFile &&
    prevProps.baseFilename === nextProps.baseFilename &&
    prevProps.onPlaySegment === nextProps.onPlaySegment &&
    prevProps.onExtractAudio === nextProps.onExtractAudio &&
    prevProps.onDownloadAudio === nextProps.onDownloadAudio &&
    prevProps.onDeleteSegment === nextProps.onDeleteSegment &&
    prevProps.onUpdateSegment === nextProps.onUpdateSegment
  );
};

// Export memoized component
const SegmentList = memo(SegmentListComponent, arePropsEqual);
SegmentList.displayName = 'SegmentList';

export default SegmentList;
