import { useState, useEffect, useCallback, useRef } from 'react';

// Spotify Web Playback SDK types
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  addListener: (event: string, callback: (data: any) => void) => void;
  removeListener: (event: string, callback?: (data: any) => void) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  setName: (name: string) => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (position_ms: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
}

interface SpotifyPlayerState {
  context: any;
  disallows: any;
  paused: boolean;
  position: number;
  repeat_mode: number;
  shuffle: boolean;
  track_window: {
    current_track: SpotifyTrack;
    previous_tracks: SpotifyTrack[];
    next_tracks: SpotifyTrack[];
  };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
}

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
    deviceId: string | null;
  }>({
    currentTrack: null,
    audioData: null,
    isPlaying: false,
    isConnected: false,
    error: null,
    volume: 0.7,
    deviceId: null,
  });

  const playerRef = useRef<SpotifyPlayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();
  const sdkLoadedRef = useRef<boolean>(false);

  // Get access token for Spotify SDK
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }
    } catch (error) {
      console.error('Failed to get access token:', error);
    }
    return null;
  }, []);

  // Initialize Spotify Web Playback SDK
  const initializeSpotifySDK = useCallback(() => {
    if (sdkLoadedRef.current || typeof window === 'undefined') return;

    // Load Spotify Web Playback SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Waveline Audio Visualizer',
        getOAuthToken: async (cb) => {
          const token = await getAccessToken();
          if (token) cb(token);
        },
        volume: state.volume,
      });

      // Error handling
      player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify SDK initialization error:', message);
        setState(prev => ({ ...prev, error: 'Failed to initialize Spotify player' }));
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify authentication error:', message);
        setState(prev => ({ ...prev, error: 'Spotify authentication failed', isConnected: false }));
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
        setState(prev => ({ ...prev, error: 'Spotify Premium required', isConnected: false }));
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
        setState(prev => ({ ...prev, error: 'Playback error occurred' }));
      });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify player ready with device ID:', device_id);
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          deviceId: device_id,
          error: null 
        }));
        
        // Transfer playback to this device
        transferPlayback(device_id);
      });

      // Not ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('Spotify player not ready:', device_id);
        setState(prev => ({ ...prev, isConnected: false }));
      });

      // Player state changed
      player.addListener('player_state_changed', (spotifyState) => {
        if (!spotifyState) return;

        const track = spotifyState.track_window.current_track;
        const trackInfo: TrackInfo = {
          name: track.name,
          artists: track.artists.map(artist => artist.name),
          album: track.album.name,
          image: track.album.images[0]?.url,
          duration_ms: track.duration_ms,
          progress_ms: spotifyState.position,
          is_playing: !spotifyState.paused,
        };

        setState(prev => ({
          ...prev,
          currentTrack: trackInfo,
          isPlaying: !spotifyState.paused,
        }));

        // Initialize audio analysis when playback starts
        if (!spotifyState.paused && !audioContextRef.current) {
          initializeAudioAnalysis();
        }
      });

      playerRef.current = player;
      player.connect();
    };

    sdkLoadedRef.current = true;
  }, [getAccessToken, state.volume]);

  // Transfer playback to our device
  const transferPlayback = useCallback(async (deviceId: string) => {
    try {
      await fetch('/api/spotify/me/player', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false,
        }),
      });
    } catch (error) {
      console.error('Failed to transfer playback:', error);
    }
  }, []);

  // Initialize audio analysis for real-time visualization
  const initializeAudioAnalysis = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Try to connect to the audio element created by Spotify SDK
      const audioElements = document.querySelectorAll('audio');
      const spotifyAudio = Array.from(audioElements).find(audio => 
        audio.src && audio.src.includes('spotify')
      );

      if (spotifyAudio && !sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(spotifyAudio);
        sourceRef.current.connect(analyserRef.current!);
        analyserRef.current!.connect(audioContextRef.current.destination);
        console.log('🎵 Connected to Spotify audio for real-time analysis!');
      }
    } catch (error) {
      console.error('Failed to initialize audio analysis:', error);
    }
  }, []);



  // Real-time audio analysis from Spotify SDK
  const updateAudioData = useCallback(() => {
    if (analyserRef.current && sourceRef.current) {
      // Real audio analysis from Spotify playback
      const frequencies = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(frequencies);

      // Calculate frequency bands for better visualization
      const bassEnd = Math.floor(frequencies.length * 0.15);
      const midEnd = Math.floor(frequencies.length * 0.6);
      
      const bassLevel = frequencies.slice(0, bassEnd).reduce((a, b) => a + b, 0) / (bassEnd * 255);
      const midLevel = frequencies.slice(bassEnd, midEnd).reduce((a, b) => a + b, 0) / ((midEnd - bassEnd) * 255);
      const trebleLevel = frequencies.slice(midEnd).reduce((a, b) => a + b, 0) / ((frequencies.length - midEnd) * 255);
      
      // Overall volume level
      const volume = frequencies.reduce((a, b) => a + b, 0) / (frequencies.length * 255);

      setState(prev => ({
        ...prev,
        audioData: {
          frequencies,
          volume,
          bassLevel,
          midLevel,
          trebleLevel,
        }
      }));
    } else if (state.isPlaying) {
      // Fallback visualization when real audio isn't available
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

  // Control playback using Spotify SDK
  const togglePlayback = useCallback(async () => {
    try {
      if (playerRef.current) {
        await playerRef.current.togglePlay();
        // Initialize audio analysis on first play
        if (!state.isPlaying && !audioContextRef.current) {
          setTimeout(initializeAudioAnalysis, 500);
        }
      } else {
        setState(prev => ({ ...prev, error: 'Spotify player not ready' }));
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      setState(prev => ({ ...prev, error: 'Playback control failed' }));
    }
  }, [state.isPlaying, initializeAudioAnalysis]);

  const setVolume = useCallback(async (volume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      
      if (playerRef.current) {
        await playerRef.current.setVolume(clampedVolume);
        setState(prev => ({ ...prev, volume: clampedVolume, error: null }));
      }
    } catch (error) {
      console.warn('Volume control unavailable:', error);
    }
  }, []);

  const skipToNext = useCallback(async () => {
    try {
      if (playerRef.current) {
        await playerRef.current.nextTrack();
      }
    } catch (error) {
      console.error('Failed to skip track:', error);
    }
  }, []);

  const skipToPrevious = useCallback(async () => {
    try {
      if (playerRef.current) {
        await playerRef.current.previousTrack();
      }
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
    }
  }, []);

  // Initialize Spotify SDK and audio analysis
  useEffect(() => {
    initializeSpotifySDK();
    updateAudioData();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [initializeSpotifySDK, updateAudioData]);

  return {
    ...state,
    togglePlayback,
    setVolume,
    skipToNext,
    skipToPrevious,
    player: playerRef.current,
    hasRealAudio: !!(analyserRef.current && sourceRef.current),
  };
}