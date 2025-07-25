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
  const [state, setState] = useState<SpotifyPlayerState>({
    currentTrack: null,
    audioData: null,
    isPlaying: false,
    isConnected: false,
    error: null,
    volume: 0.7,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize audio context for visualization
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

  // Fetch current track from Spotify
  const fetchCurrentTrack = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/me/player/currently-playing');
      
      if (response.status === 204) {
        setState(prev => ({ ...prev, currentTrack: null, isPlaying: false }));
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          setState(prev => ({ ...prev, error: 'Authentication expired', isConnected: false }));
          return;
        }
        throw new Error(`HTTP ${response.status}`);
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
      console.error('Failed to fetch current track:', error);
      setState(prev => ({ ...prev, error: 'Failed to fetch track info' }));
    }
  }, []);

  // Generate audio visualization data
  const updateAudioData = useCallback(() => {
    if (!analyserRef.current) {
      // Generate fallback data based on current track
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
          volume: state.volume,
          bassLevel,
          midLevel,
          trebleLevel,
        }
      }));
    } else {
      const frequencies = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(frequencies);

      // Calculate levels
      const bassEnd = Math.floor(frequencies.length * 0.1);
      const midEnd = Math.floor(frequencies.length * 0.5);
      
      const bassLevel = frequencies.slice(0, bassEnd).reduce((a, b) => a + b, 0) / (bassEnd * 255);
      const midLevel = frequencies.slice(bassEnd, midEnd).reduce((a, b) => a + b, 0) / ((midEnd - bassEnd) * 255);
      const trebleLevel = frequencies.slice(midEnd).reduce((a, b) => a + b, 0) / ((frequencies.length - midEnd) * 255);

      setState(prev => ({
        ...prev,
        audioData: {
          frequencies,
          volume: state.volume,
          bassLevel,
          midLevel,
          trebleLevel,
        }
      }));
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  }, [state.volume]);

  // Control playback
  const togglePlayback = useCallback(async () => {
    try {
      const endpoint = state.isPlaying ? 'pause' : 'play';
      const response = await fetch(`/api/spotify/me/player/${endpoint}`, {
        method: 'PUT',
      });

      if (response.ok || response.status === 204) {
        setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  }, [state.isPlaying]);

  const setVolume = useCallback(async (volume: number) => {
    try {
      const volumePercent = Math.round(volume * 100);
      const response = await fetch(`/api/spotify/me/player/volume?volume_percent=${volumePercent}`, {
        method: 'PUT',
      });

      if (response.ok || response.status === 204) {
        setState(prev => ({ ...prev, volume }));
      }
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }, []);

  const skipToNext = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/me/player/next', {
        method: 'POST',
      });

      if (response.ok || response.status === 204) {
        // Fetch updated track info after a short delay
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
        // Fetch updated track info after a short delay
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
  };
}