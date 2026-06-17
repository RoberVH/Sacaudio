/**
 * Custom hook for managing application state
 * Uses React's useReducer for predictable state management
 */

import { useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  AppState,
  Action,
  VideoSegment,
  AudioFormat,
  PlaybackSpeed,
  Theme,
  Language,
  ExtractionStatus,
} from '../types';

// Initial state
const initialState: AppState = {
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

// Reducer function
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIDEO_FILE':
      return { ...state, videoFile: action.payload };

    case 'SET_VIDEO_URL':
      return { ...state, videoUrl: action.payload };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_DURATION':
      return { ...state, duration: action.payload };

    case 'SET_PLAYBACK_SPEED':
      return { ...state, playbackSpeed: action.payload };

    case 'SET_SEGMENT_START':
      return { ...state, currentSegmentStart: action.payload };

    case 'SET_SEGMENT_END':
      return { ...state, currentSegmentEnd: action.payload };

    case 'ADD_SEGMENT':
      return { ...state, segments: [...state.segments, action.payload] };

    case 'UPDATE_SEGMENT':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.payload.id ? action.payload : seg
        ),
      };

    case 'DELETE_SEGMENT':
      return {
        ...state,
        segments: state.segments.filter(seg => seg.id !== action.payload),
      };

    case 'SET_BASE_FILENAME':
      return { ...state, baseFilename: action.payload };

    case 'SET_AUDIO_FORMAT':
      return { ...state, audioFormat: action.payload };

    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'RESET_SEGMENT_SELECTION':
      return {
        ...state,
        currentSegmentStart: null,
        currentSegmentEnd: null,
      };

    default:
      return state;
  }
}

// Custom hook
export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const savedLanguage = localStorage.getItem('language') as Language | null;
    const savedBaseFilename = localStorage.getItem('baseFilename') || 'movie_audio';
    const savedAudioFormat = localStorage.getItem('audioFormat') as AudioFormat | null;

    if (savedTheme) {
      dispatch({ type: 'SET_THEME', payload: savedTheme });
    }

    if (savedLanguage) {
      dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage });
    }

    if (savedBaseFilename) {
      dispatch({ type: 'SET_BASE_FILENAME', payload: savedBaseFilename });
    }

    if (savedAudioFormat) {
      dispatch({ type: 'SET_AUDIO_FORMAT', payload: savedAudioFormat });
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('theme', state.theme);
    localStorage.setItem('language', state.language);
    localStorage.setItem('baseFilename', state.baseFilename);
    localStorage.setItem('audioFormat', state.audioFormat);
  }, [state.theme, state.language, state.baseFilename, state.audioFormat]);

  // Create a new segment
  const createSegment = useCallback((name: string): VideoSegment => {
    const now = new Date();
    const start = state.currentSegmentStart ?? 0;
    const end = state.currentSegmentEnd ?? state.duration;

    return {
      id: uuidv4(),
      name: name || `Segment ${state.segments.length + 1}`,
      startTime: start,
      endTime: end,
      audioFormat: state.audioFormat,
      status: 'pending',
      createdAt: now,
    };
  }, [state.currentSegmentStart, state.currentSegmentEnd, state.duration, state.segments.length, state.audioFormat]);

  // Add a new segment
  const addSegment = useCallback((name: string) => {
    if (state.currentSegmentStart === null || state.currentSegmentEnd === null) {
      dispatch({ type: 'SET_ERROR', payload: 'Please set both start and end times' });
      return;
    }

    if (state.currentSegmentEnd <= state.currentSegmentStart) {
      dispatch({ type: 'SET_ERROR', payload: 'End time must be greater than start time' });
      return;
    }

    const segment = createSegment(name);
    dispatch({ type: 'ADD_SEGMENT', payload: segment });
    dispatch({ type: 'RESET_SEGMENT_SELECTION' });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [state.currentSegmentStart, state.currentSegmentEnd, createSegment]);

  // Update segment audio format
  const updateSegmentFormat = useCallback((segmentId: string, format: AudioFormat) => {
    dispatch({
      type: 'UPDATE_SEGMENT',
      payload: {
        ...state.segments.find(seg => seg.id === segmentId)!,
        audioFormat: format,
      },
    });
  }, [state.segments]);

  // Update segment name
  const updateSegmentName = useCallback((segmentId: string, name: string) => {
    dispatch({
      type: 'UPDATE_SEGMENT',
      payload: {
        ...state.segments.find(seg => seg.id === segmentId)!,
        name,
      },
    });
  }, [state.segments]);

  // Update segment custom filename
  const updateSegmentCustomFilename = useCallback((segmentId: string, filename: string) => {
    dispatch({
      type: 'UPDATE_SEGMENT',
      payload: {
        ...state.segments.find(seg => seg.id === segmentId)!,
        customFilename: filename,
      },
    });
  }, [state.segments]);

  // Set segment start time at current position
  const setSegmentStart = useCallback(() => {
    dispatch({ type: 'SET_SEGMENT_START', payload: state.currentTime });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [state.currentTime]);

  // Set segment end time at current position
  const setSegmentEnd = useCallback(() => {
    dispatch({ type: 'SET_SEGMENT_END', payload: state.currentTime });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [state.currentTime]);

  // Set video file and create URL
  const setVideoFile = useCallback((file: File | null) => {
    dispatch({ type: 'SET_VIDEO_FILE', payload: file });
    
    if (file) {
      const url = URL.createObjectURL(file);
      dispatch({ type: 'SET_VIDEO_URL', payload: url });
      dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
      dispatch({ type: 'SET_PLAYING', payload: false });
      dispatch({ type: 'RESET_SEGMENT_SELECTION' });
      dispatch({ type: 'SET_ERROR', payload: null });
    } else {
      dispatch({ type: 'SET_VIDEO_URL', payload: null });
      dispatch({ type: 'SET_DURATION', payload: 0 });
      dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
    }
  }, []);

  // Clean up video URL when unmounting or changing file
  useEffect(() => {
    return () => {
      if (state.videoUrl) {
        URL.revokeObjectURL(state.videoUrl);
      }
    };
  }, [state.videoUrl]);

  // Play/pause video
  const togglePlay = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying });
  }, [state.isPlaying]);

  // Set playback speed
  const setPlaybackSpeed = useCallback((speed: PlaybackSpeed) => {
    dispatch({ type: 'SET_PLAYBACK_SPEED', payload: speed });
  }, []);

  // Set theme
  const setTheme = useCallback((theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  // Set language
  const setLanguage = useCallback((language: Language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  }, []);

  // Set base filename
  const setBaseFilename = useCallback((filename: string) => {
    dispatch({ type: 'SET_BASE_FILENAME', payload: filename });
  }, []);

  // Set audio format
  const setAudioFormat = useCallback((format: AudioFormat) => {
    dispatch({ type: 'SET_AUDIO_FORMAT', payload: format });
  }, []);

  // Delete segment
  const deleteSegment = useCallback((segmentId: string) => {
    dispatch({ type: 'DELETE_SEGMENT', payload: segmentId });
  }, []);

  // Update segment status
  const updateSegmentStatus = useCallback((
    segmentId: string,
    status: ExtractionStatus,
    errorMessage?: string
  ) => {
    dispatch({
      type: 'UPDATE_SEGMENT',
      payload: {
        ...state.segments.find(seg => seg.id === segmentId)!,
        status,
        errorMessage,
      },
    });
  }, [state.segments]);

  // Update segment with audio blob
  const updateSegmentWithAudio = useCallback((
    segmentId: string,
    audioBlob: Blob
  ) => {
    const segment = state.segments.find(seg => seg.id === segmentId);
    if (!segment) return;

    const audioUrl = URL.createObjectURL(audioBlob);
    
    dispatch({
      type: 'UPDATE_SEGMENT',
      payload: {
        ...segment,
        audioBlob,
        audioUrl,
        status: 'ready',
        errorMessage: undefined,
      },
    });
  }, [state.segments]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Set loading state
  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, []);

  return {
    state,
    // Actions
    setVideoFile,
    togglePlay,
    setPlaybackSpeed,
    setSegmentStart,
    setSegmentEnd,
    addSegment,
    deleteSegment,
    setTheme,
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
    // Helpers
    createSegment,
  };
}

// UUID v4 implementation for browser
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
