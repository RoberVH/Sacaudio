/**
 * Format seconds into HH:MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return '00:00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':');
}

/**
 * Parse HH:MM:SS string to seconds
 * @param timeStr - Time string in HH:MM:SS format
 * @returns Time in seconds
 */
export function parseTime(timeStr: string): number {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format time for filename (removes colons and adds hyphens)
 * @param seconds - Time in seconds
 * @returns Formatted time string for filename
 */
export function formatTimeForFilename(seconds: number): string {
  const formatted = formatTime(seconds);
  return formatted.replace(/:/g, '-');
}

/**
 * Generate filename for audio segment
 * @param baseName - Base filename
 * @param startTime - Segment start time in seconds
 * @param endTime - Segment end time in seconds
 * @param format - Audio format
 * @returns Generated filename
 */
export function generateAudioFilename(
  baseName: string,
  startTime: number,
  endTime: number,
  format: string
): string {
  const start = formatTimeForFilename(startTime);
  const end = formatTimeForFilename(endTime);
  
  // Sanitize base name - remove invalid filename characters
  const sanitizedBase = baseName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .trim();

  return `${sanitizedBase}_${start}_to_${end}.${format}`;
}

/**
 * Sanitize filename by removing invalid characters
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .trim()
    .substring(0, 255); // Limit to 255 characters
}

/**
 * Calculate duration between two timestamps
 * @param start - Start time in seconds
 * @param end - End time in seconds
 * @returns Duration in seconds
 */
export function calculateDuration(start: number, end: number): number {
  return Math.max(0, end - start);
}

/**
 * Clamp value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
