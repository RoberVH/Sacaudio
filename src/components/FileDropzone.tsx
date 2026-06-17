/**
 * FileDropzone Component
 * 
 * Provides a drag-and-drop area for loading video files
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Film } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  videoFile: File | null;
  isLoading: boolean;
}

const SUPPORTED_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo'];
const SUPPORTED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi'];

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  onFileRemove,
  videoFile,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection via click
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  // Handle file processing
  const handleFile = useCallback((file: File) => {
    setError(null);

    // Check if file is a video
    if (!file.type.startsWith('video/') && !SUPPORTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setError(t('video.error'));
      return;
    }

    // Check file size (limit to 2GB for browser processing)
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > MAX_SIZE) {
      setError('File is too large. Maximum size is 2GB.');
      return;
    }

    onFileSelect(file);
  }, [t, onFileSelect]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle remove file
  const handleRemoveFile = useCallback(() => {
    setError(null);
    onFileRemove();
  }, [onFileRemove]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="w-full">
      {/* File input (hidden) */}
      <input
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        id="file-input"
      />

      {/* Dropzone */}
      <label
        htmlFor="file-input"
        className={`block w-full p-8 rounded-lg border-2 border-dashed transition-all duration-200 ${
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('video.loading')}
              </p>
            </div>
          ) : videoFile ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <Film className="w-8 h-8 text-primary-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {videoFile.name}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveFile();
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Upload className="w-12 h-12 text-primary-500" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('video.dropzone')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('video.supportedFormats')}
              </p>
            </div>
          )}
        </div>
      </label>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" />
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
