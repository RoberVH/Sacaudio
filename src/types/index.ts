// Audio formats supported by the app
export type AudioFormat = 'wav' | 'mp3' | 'aac' | 'flac' | 'ogg';

// Segment extraction status
export type ExtractionStatus = 'pending' | 'processing' | 'ready' | 'error';

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Language types
export type Language = 'en' | 'es' | 'pt';

// Playback speed options
export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

// Video segment interface
export interface VideoSegment {
  id: string;
  name: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  audioFormat: AudioFormat;
  customFilename?: string;
  status: ExtractionStatus;
  audioBlob?: Blob;
  audioUrl?: string;
  errorMessage?: string;
  createdAt: Date;
}

// App state interface
export interface AppState {
  videoFile: File | null;
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: PlaybackSpeed;
  segments: VideoSegment[];
  currentSegmentStart: number | null;
  currentSegmentEnd: number | null;
  baseFilename: string;
  audioFormat: AudioFormat;
  theme: Theme;
  language: Language;
  isLoading: boolean;
  error: string | null;
}

// FFmpeg extraction options
export interface ExtractionOptions {
  format: AudioFormat;
  startTime: number;
  endTime: number;
  preserveQuality: boolean;
}

// Video file info
export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  audioCodec?: string;
  videoCodec?: string;
}

// Action types for state management
export type Action =
  | { type: 'SET_VIDEO_FILE'; payload: File | null }
  | { type: 'SET_VIDEO_URL'; payload: string | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_PLAYBACK_SPEED'; payload: PlaybackSpeed }
  | { type: 'SET_SEGMENT_START'; payload: number }
  | { type: 'SET_SEGMENT_END'; payload: number }
  | { type: 'ADD_SEGMENT'; payload: VideoSegment }
  | { type: 'UPDATE_SEGMENT'; payload: VideoSegment }
  | { type: 'DELETE_SEGMENT'; payload: string }
  | { type: 'SET_BASE_FILENAME'; payload: string }
  | { type: 'SET_AUDIO_FORMAT'; payload: AudioFormat }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_SEGMENT_SELECTION' };

// Props interfaces
export interface VideoPlayerProps {
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: PlaybackSpeed;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  onSegmentPlay: (start: number, end: number) => void;
}

export interface TimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onSetStart: () => void;
  onSetEnd: () => void;
}

export interface SegmentControlsProps {
  currentSegmentStart: number | null;
  currentSegmentEnd: number | null;
  duration: number;
  onSetStart: () => void;
  onSetEnd: () => void;
  onAddSegment: (name: string) => void;
  onPlaySegment: () => void;
}

export interface SegmentListProps {
  segments: VideoSegment[];
  onPlaySegment: (segment: VideoSegment) => void;
  onExtractAudio: (segmentId: string) => void;
  onDownloadAudio: (segment: VideoSegment) => void;
  onDeleteSegment: (segmentId: string) => void;
  onUpdateSegment: (segment: VideoSegment) => void;
}

export interface SettingsPanelProps {
  theme: Theme;
  language: Language;
  baseFilename: string;
  audioFormat: AudioFormat;
  onThemeChange: (theme: Theme) => void;
  onLanguageChange: (language: Language) => void;
  onBaseFilenameChange: (filename: string) => void;
  onAudioFormatChange: (format: AudioFormat) => void;
}

export interface AudioExtractorProps {
  videoFile: File | null;
  segments: VideoSegment[];
  audioFormat: AudioFormat;
  baseFilename: string;
  onProgress: (segmentId: string, progress: number) => void;
  onComplete: (segmentId: string, audioBlob: Blob) => void;
  onError: (segmentId: string, error: string) => void;
}
