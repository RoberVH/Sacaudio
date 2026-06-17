/**
 * Zustand Store for Application State
 * Replaces the useAppState hook with a more scalable state management solution
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AppState,
  VideoSegment,
  AudioFormat,
  PlaybackSpeed,
  Theme,
  Language,
  ExtractionStatus,
} from '../types';

// Helper function to generate UUID
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Initial state
const initialState: Omit<AppState, 'segments'> & { segments: VideoSegment[] } = {
  videoFile: null,
  videoUrl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1,
  segments: [],
  currentSegmentStart: null,
  currentSegmentEnd: null,
  baseFilename: 'movie_audio',
  audioFormat: 'mp3',
  theme: 'light',
  language: 'en',
  isLoading: false,
  error: null,
};

// Persist config for localStorage
const persistConfig = {
  name: 'sacaudio-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state: any) => ({
    theme: state.theme,
    language: state.language,
    baseFilename: state.baseFilename,
    audioFormat: state.audioFormat,
  }),
};

// Create the store
const useAppStore = create<AppState & {
  // Actions
  setVideoFile: (file: File | null) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSegmentStart: () => void;
  setSegmentEnd: () => void;
  addSegment: (name: string) => void;
  deleteSegment: (segmentId: string) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setBaseFilename: (filename: string) => void;
  setAudioFormat: (format: AudioFormat) => void;
  updateSegmentFormat: (segmentId: string, format: AudioFormat) => void;
  updateSegmentName: (segmentId: string, name: string) => void;
  updateSegmentCustomFilename: (segmentId: string, filename: string) => void;
  updateSegmentStatus: (segmentId: string, status: ExtractionStatus, errorMessage?: string) => void;
  updateSegmentWithAudio: (segmentId: string, audioBlob: Blob) => void;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
  resetSegmentSelection: () => void;
  createSegment: (name: string) => VideoSegment;
}>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Actions
      setVideoFile: (file: File | null) => {
        // Clean up previous video URL
        const currentVideoUrl = get().videoUrl;
        if (currentVideoUrl) {
          URL.revokeObjectURL(currentVideoUrl);
        }

        if (file) {
          const url = URL.createObjectURL(file);
          set({
            videoFile: file,
            videoUrl: url,
            currentTime: 0,
            isPlaying: false,
            error: null,
          });
          get().resetSegmentSelection();
        } else {
          set({
            videoFile: null,
            videoUrl: null,
            duration: 0,
            currentTime: 0,
          });
        }
      },

      togglePlay: () => {
        set((state) => ({ isPlaying: !state.isPlaying }));
      },

      setPlaybackSpeed: (speed: PlaybackSpeed) => {
        set({ playbackSpeed: speed });
      },

      setCurrentTime: (time: number) => {
        set({ currentTime: time });
      },

      setDuration: (duration: number) => {
        set({ duration });
      },

      setSegmentStart: () => {
        const currentTime = get().currentTime;
        set({
          currentSegmentStart: currentTime,
          error: null,
        });
      },

      setSegmentEnd: () => {
        const currentTime = get().currentTime;
        set({
          currentSegmentEnd: currentTime,
          error: null,
        });
      },

      resetSegmentSelection: () => {
        set({
          currentSegmentStart: null,
          currentSegmentEnd: null,
        });
      },

      createSegment: (name: string): VideoSegment => {
        const state = get();
        const now = new Date();
        const start = state.currentSegmentStart ?? 0;
        const end = state.currentSegmentEnd ?? state.duration;

        return {
          id: generateId(),
          name: name || `Segment ${state.segments.length + 1}`,
          startTime: start,
          endTime: end,
          audioFormat: state.audioFormat,
          status: 'pending',
          createdAt: now,
        };
      },

      addSegment: (name: string) => {
        const state = get();
        
        if (state.currentSegmentStart === null || state.currentSegmentEnd === null) {
          set({ error: 'Please set both start and end times' });
          return;
        }

        if (state.currentSegmentEnd <= state.currentSegmentStart) {
          set({ error: 'End time must be greater than start time' });
          return;
        }

        const segment = get().createSegment(name);
        set({
          segments: [...state.segments, segment],
          error: null,
        });
        get().resetSegmentSelection();
      },

      deleteSegment: (segmentId: string) => {
        set((state) => ({
          segments: state.segments.filter((seg) => seg.id !== segmentId),
        }));
      },

      updateSegmentFormat: (segmentId: string, format: AudioFormat) => {
        set((state) => ({
          segments: state.segments.map((seg) =>
            seg.id === segmentId ? { ...seg, audioFormat: format } : seg
          ),
        }));
      },

      updateSegmentName: (segmentId: string, name: string) => {
        set((state) => ({
          segments: state.segments.map((seg) =>
            seg.id === segmentId ? { ...seg, name } : seg
          ),
        }));
      },

      updateSegmentCustomFilename: (segmentId: string, filename: string) => {
        set((state) => ({
          segments: state.segments.map((seg) =>
            seg.id === segmentId ? { ...seg, customFilename: filename } : seg
          ),
        }));
      },

      updateSegmentStatus: (segmentId: string, status: ExtractionStatus, errorMessage?: string) => {
        set((state) => ({
          segments: state.segments.map((seg) =>
            seg.id === segmentId ? { ...seg, status, errorMessage } : seg
          ),
        }));
      },

      updateSegmentWithAudio: (segmentId: string, audioBlob: Blob) => {
        set((state) => {
          const segment = state.segments.find((seg) => seg.id === segmentId);
          if (!segment) return state;

          const audioUrl = URL.createObjectURL(audioBlob);
          return {
            segments: state.segments.map((seg) =>
              seg.id === segmentId
                ? {
                    ...seg,
                    audioBlob,
                    audioUrl,
                    status: 'ready',
                    errorMessage: undefined,
                  }
                : seg
            ),
          };
        });
      },

      setTheme: (theme: Theme) => {
        set({ theme });
      },

      setLanguage: (language: Language) => {
        set({ language });
      },

      setBaseFilename: (filename: string) => {
        set({ baseFilename: filename });
      },

      setAudioFormat: (format: AudioFormat) => {
        set({ audioFormat: format });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },
    }),
    persistConfig
  )
);

// Selector hooks for better performance
export const useVideoFile = () => useAppStore((state) => state.videoFile);
export const useVideoUrl = () => useAppStore((state) => state.videoUrl);
export const useIsPlaying = () => useAppStore((state) => state.isPlaying);
export const useCurrentTime = () => useAppStore((state) => state.currentTime);
export const useDuration = () => useAppStore((state) => state.duration);
export const usePlaybackSpeed = () => useAppStore((state) => state.playbackSpeed);
export const useSegments = () => useAppStore((state) => state.segments);
export const useCurrentSegmentStart = () => useAppStore((state) => state.currentSegmentStart);
export const useCurrentSegmentEnd = () => useAppStore((state) => state.currentSegmentEnd);
export const useBaseFilename = () => useAppStore((state) => state.baseFilename);
export const useAudioFormat = () => useAppStore((state) => state.audioFormat);
export const useTheme = () => useAppStore((state) => state.theme);
export const useLanguage = () => useAppStore((state) => state.language);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);

// Export the main store
export default useAppStore;
