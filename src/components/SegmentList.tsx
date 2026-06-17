/**
 * SegmentList Component
 * 
 * Displays the list of segments with their status and provides controls
 * for each segment (play, extract, download, delete)
 */

import React, { useCallback, useState } from 'react';
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

export const SegmentList: React.FC<SegmentListProps> = ({
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
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingFilename, setEditingFilename] = useState('');
  const [extractingSegments, setExtractingSegments] = useState<Set<string>>(new Set());

  // Handle play segment
  const handlePlaySegment = useCallback((segment: VideoSegment) => {
    onPlaySegment(segment.startTime, segment.endTime);
  }, [onPlaySegment]);

  // Handle extract audio for a segment
  const handleExtractAudio = useCallback((segment: VideoSegment) => {
    if (!videoFile) {
      console.error('No video file available for extraction');
      return;
    }

    // Mark as processing
    setExtractingSegments(prev => new Set(prev).add(segment.id));
    onUpdateSegment({ ...segment, status: 'processing' });

    // Start extraction
    extractAudioSegment(
      videoFile,
      segment,
      (progress) => {
        // Update progress if needed
        console.log(`Extraction progress for ${segment.id}: ${progress}%`);
      },
      (audioBlob) => {
        // Extraction complete
        setExtractingSegments(prev => {
          const newSet = new Set(prev);
          newSet.delete(segment.id);
          return newSet;
        });
        
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
        // Extraction failed
        setExtractingSegments(prev => {
          const newSet = new Set(prev);
          newSet.delete(segment.id);
          return newSet;
        });
        
        const updatedSegment: VideoSegment = {
          ...segment,
          status: 'error',
          errorMessage: error,
        };
        onUpdateSegment(updatedSegment);
      }
    );
  }, [videoFile, onUpdateSegment]);

  // Handle download audio
  const handleDownloadAudio = useCallback((segment: VideoSegment) => {
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
  }, [baseFilename, onDownloadAudio]);

  // Handle delete segment
  const handleDeleteSegment = useCallback((segmentId: string) => {
    if (window.confirm(t('segments.confirmDelete'))) {
      onDeleteSegment(segmentId);
    }
  }, [t, onDeleteSegment]);

  // Handle edit segment
  const handleEditSegment = useCallback((segment: VideoSegment) => {
    setEditingSegmentId(segment.id);
    setEditingName(segment.name);
    setEditingFilename(segment.customFilename || '');
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (!editingSegmentId) return;

    const segment = segments.find(s => s.id === editingSegmentId);
    if (!segment) return;

    const updatedSegment: VideoSegment = {
      ...segment,
      name: editingName.trim() || segment.name,
      customFilename: editingFilename.trim() || undefined,
    };

    onUpdateSegment(updatedSegment);
    setEditingSegmentId(null);
    setEditingName('');
    setEditingFilename('');
  }, [editingSegmentId, editingName, editingFilename, segments, onUpdateSegment]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingSegmentId(null);
    setEditingName('');
    setEditingFilename('');
  }, []);

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
            {sortedSegments.map((segment) => {
              const statusInfo = getStatusInfo(segment.status);
              const duration = segment.endTime - segment.startTime;
              const isExtracting = extractingSegments.has(segment.id);

              return (
                <tr key={segment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4 whitespace-nowrap">
                    {editingSegmentId === segment.id ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {segment.name}
                      </span>
                    )}
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
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-1">
                      {/* Play segment */}
                      <button
                        onClick={() => handlePlaySegment(segment)}
                        className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
                        title={t('tooltips.playSegment')}
                      >
                        <Play className="w-4 h-4" />
                      </button>

                      {/* Extract audio */}
                      <button
                        onClick={() => handleExtractAudio(segment)}
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
                        onClick={() => handleDownloadAudio(segment)}
                        disabled={segment.status !== 'ready' || !segment.audioBlob}
                        className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('tooltips.download')}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* Edit segment */}
                      <button
                        onClick={() => handleEditSegment(segment)}
                        className="p-1 text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900 rounded transition-colors"
                        title="Edit segment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete segment */}
                      <button
                        onClick={() => handleDeleteSegment(segment.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                        title={t('tooltips.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editingSegmentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Edit Segment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Segment Name
                </label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custom Filename (optional)
                </label>
                <input
                  type="text"
                  value={editingFilename}
                  onChange={(e) => setEditingFilename(e.target.value)}
                  placeholder="Leave empty to use default naming"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentList;
