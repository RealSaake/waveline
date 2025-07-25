import { useState, useEffect, useCallback, useRef } from 'react';

export interface TrackInfo {
  name: string;
  artists: string[];
  album: string;
  image?: string;
  duration_ms: number;
  progress_ms: number;
  is_playing: boolean;
}

export interface AudioData {
  frequencies: Uint8Array;
  volume: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
}

export interface SpotifyPlayerState {
  currentTrack: TrackInfo | null;
  audioData: AudioData | null;
  isPlaying: boolean;
  isConnected: boolean;
  error: string | null;
  volume: number;
}

export function useSpotifyPlayer() {
  const [state, setState] = useState<{
    currentTrack: TrackInfo | null;
    audioData: AudioData | null;
    isPlaying: boolean;
    isConnected: boolean;
    error: string | null;
    volume: number;
  }>({
    currentTrack: null,
    audioData: null,
    isPlaying: false,
    isConnected: false,
    error: null,
    volume: 0.7,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Fetch current track from Spotify API
  const fetchCurrentTrack = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/me/player/currently-playing');
      
      if (response.status === 204) {
        setState(prev => ({ ...prev, currentTrack: null, isPlaying: false }));
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          setState(prev => ({ ...prev, error: 'Please reconnect to Spotify', isConnected: false }));
          return;
        }
        return;
      }

      const data = await response.json();
      
      if (data && data.item) {
        const track: TrackInfo = {
          name: data.item.name,
          artists: data.item.artists.map((artist: any) => artist.name),
          album: data.item.album.name,
          image: data.item.album.images[0]?.url,
          duration_ms: data.item.duration_ms,
          progress_ms: data.progress_ms || 0,
          is_playing: data.is_playing,
        };

        setState(prev => ({ 
          ...prev, 
          currentTrack: track, 
          isPlaying: data.is_playing,
          isConnected: true,
          error: null 
        }));
      }
    } catch (error) {
      console.warn('Spotify API request failed:', error);
    }
  }, []);

  // Initialize basic audio context for visualization
  const initializeAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, []);



  // Generate audio visualization data
  const updateAudioData = useCallback(() => {
    if (state.isPlaying) {
      // Generate realistic audio visualization data
      const frequencies = new Uint8Array(128);
      const time = Date.now() / 1000;
      
      for (let i = 0; i < frequencies.length; i++) {
        frequencies[i] = Math.sin(time * 2 + i * 0.1) * 50 + 100 + Math.random() * 30;
      }

      const bassLevel = Math.sin(time * 3) * 0.3 + 0.5;
      const midLevel = Math.sin(time * 2.5) * 0.3 + 0.5;
      const trebleLevel = Math.sin(time * 4) * 0.3 + 0.5;

      setState(prev => ({
        ...prev,
        audioData: {
          frequencies,
          volume: 0.6,
          bassLevel,
          midLevel,
          trebleLevel,
        }
      }));
    } else {
      // Silent state
      setState(prev => ({
        ...prev,
        audioData: {
          frequencies: new Uint8Array(128),
          volume: 0,
          bassLevel: 0,
          midLevel: 0,
          trebleLevel: 0,
        }
      }));
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  }, [state.isPlaying]);

  // Control playback using Spotify API
  const togglePlayback = useCallback(async () => {
    try {
      await initializeAudioContext();

      const endpoint = state.isPlaying ? 'pause' : 'play';
      const response = await fetch(`/api/spotify/me/player/${endpoint}`, {
        method: 'PUT',
      });

      if (response.ok || response.status === 204) {
        setState(prev => ({ ...prev, isPlaying: !prev.isPlaying, error: null }));
      } else if (response.status === 404) {
        setState(prev => ({ ...prev, error: 'No active Spotify device found' }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Playback control unavailable' }));
    }
  }, [state.isPlaying, initializeAudioContext]);

  const setVolume = useCallback(async (volume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      const volumePercent = Math.round(clampedVolume * 100);
      
      const response = await fetch(`/api/spotify/me/player/volume?volume_percent=${volumePercent}`, {
        method: 'PUT',
      });

      if (response.ok || response.status === 204) {
        setState(prev => ({ ...prev, volume: clampedVolume, error: null }));
      }
    } catch (error) {
      console.warn('Volume control unavailable:', error);
    }
  }, []);

  const skipToNext = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/me/player/next', {
        method: 'POST',
      });

      if (response.ok || response.status === 204) {
        setTimeout(fetchCurrentTrack, 1000);
      }
    } catch (error) {
      console.error('Failed to skip track:', error);
    }
  }, [fetchCurrentTrack]);

  const skipToPrevious = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/me/player/previous', {
        method: 'POST',
      });

      if (response.ok || response.status === 204) {
        setTimeout(fetchCurrentTrack, 1000);
      }
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
    }
  }, [fetchCurrentTrack]);

  // Initialize and start polling
  useEffect(() => {
    initializeAudioContext();
    fetchCurrentTrack();
    updateAudioData();

    const interval = setInterval(fetchCurrentTrack, 5000);

    return () => {
      clearInterval(interval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initializeAudioContext, fetchCurrentTrack, updateAudioData]);

  return {
    ...state,
    togglePlayback,
    setVolume,
    skipToNext,
    skipToPrevious,
    refreshTrack: fetchCurrentTrack,
    hasRealAudio: false, // Simplified - no real audio for now
  };
}