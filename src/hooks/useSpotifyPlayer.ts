import { useState, useEffect, useCallback, useRef } from 'react';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  addListener: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback?: (...args: any[]) => void) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  getVolume: () => Promise<number>;
  nextTrack: () => Promise<void>;
  pause: () => Promise<void>;
  previousTrack: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (position_ms: number) => Promise<void>;
  setName: (name: string) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  _options: {
    getOAuthToken: (cb: (token: string) => void) => void;
  };
}

interface SpotifyPlayerState {
  context: {
    uri: string;
    metadata: any;
  };
  disallows: {
    pausing: boolean;
    peeking_next: boolean;
    peeking_prev: boolean;
    resuming: boolean;
    seeking: boolean;
    skipping_next: boolean;
    skipping_prev: boolean;
  };
  paused: boolean;
  position: number;
  repeat_mode: number;
  shuffle: boolean;
  track_window: {
    current_track: SpotifyTrack;
    next_tracks: SpotifyTrack[];
    previous_tracks: SpotifyTrack[];
  };
}

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  album: {
    uri: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  artists: Array<{ uri: string; name: string }>;
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
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const sdkLoadedRef = useRef<boolean>(false);

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

  // Get access token for Spotify Web Playback SDK
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/spotify/token');
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
  const initializeSpotifySDK = useCallback(async () => {
    if (sdkLoadedRef.current || typeof window === 'undefined') return;

    return new Promise<void>((resolve) => {
      // Load Spotify Web Playback SDK
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);

      window.onSpotifyWebPlaybackSDKReady = () => {
        sdkLoadedRef.current = true;
        resolve();
      };
    });
  }, []);

  // Initialize audio context and analyser
  const initializeAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256; // This gives us 128 frequency bins
        analyserRef.current.smoothingTimeConstant = 0.8;
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, []);

  // Connect Spotify player to Web Audio API
  const connectAudioAnalyser = useCallback(async (player?: SpotifyPlayer) => {
    try {
      await initializeAudioContext();
      
      if (!audioContextRef.current || !analyserRef.current) {
        throw new Error('Audio context not initialized');
      }

      if (sourceRef.current) {
        console.log('Audio analyser already connected');
        return;
      }

      let audioElement: HTMLAudioElement | null = null;

      // Try multiple methods to find the audio element
      if (player) {
        // Method 1: Try to get from Spotify player (private API)
        audioElement = (player as any)._options?.getAudioElement?.() || 
                      (player as any)._audioElement ||
                      (player as any)._player?._html5Audio;
      }

      // Method 2: Look for any audio element on the page
      if (!audioElement) {
        audioElement = document.querySelector('audio');
      }

      // Method 3: Wait a bit and try again (audio element might be created later)
      if (!audioElement) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        audioElement = document.querySelector('audio');
      }

      if (audioElement) {
        try {
          // Create audio source from the HTML5 audio element
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
          
          // Connect: source -> analyser -> destination (speakers)
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          
          console.log('Audio analyser connected successfully to:', audioElement);
          
          // Update state to reflect real audio connection
          setState(prev => ({ ...prev, error: null }));
          
        } catch (sourceError) {
          console.warn('Failed to create media source, element might already be connected:', sourceError);
          // This can happen if the element is already connected to another source
        }
      } else {
        console.warn('No audio element found for analysis');
      }
    } catch (error) {
      console.error('Failed to connect audio analyser:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Audio analysis unavailable - using simulated data' 
      }));
    }
  }, [initializeAudioContext]);

  // Try to connect to any available audio periodically
  const tryConnectToAudio = useCallback(async () => {
    if (sourceRef.current) return; // Already connected
    
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      await connectAudioAnalyser();
    }
  }, [connectAudioAnalyser]);

  // Initialize Spotify Web Playback SDK Player
  const initializePlayer = useCallback(async () => {
    try {
      await initializeSpotifySDK();
      
      if (!window.Spotify?.Player) {
        throw new Error('Spotify Web Playback SDK not loaded');
      }

      const token = await getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const player = new window.Spotify.Player({
        name: 'Spotify Visualizer',
        getOAuthToken: (cb) => {
          getAccessToken().then(token => {
            if (token) cb(token);
          });
        },
        volume: state.volume,
      });

      // Player event listeners
      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify player ready with device ID:', device_id);
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        
        // Try to connect audio analyser after a short delay
        setTimeout(() => connectAudioAnalyser(player), 1000);
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.log('Spotify player not ready with device ID:', device_id);
        setState(prev => ({ ...prev, isConnected: false }));
      });

      player.addListener('player_state_changed', (state) => {
        if (!state) return;

        const track = state.track_window.current_track;
        const trackInfo: TrackInfo = {
          name: track.name,
          artists: track.artists.map(artist => artist.name),
          album: track.album.name,
          image: track.album.images[0]?.url,
          duration_ms: track.duration_ms,
          progress_ms: state.position,
          is_playing: !state.paused,
        };

        setState(prev => ({
          ...prev,
          currentTrack: trackInfo,
          isPlaying: !state.paused,
        }));
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify player initialization error:', message);
        setState(prev => ({ ...prev, error: message }));
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify player authentication error:', message);
        setState(prev => ({ ...prev, error: 'Authentication failed. Please reconnect.' }));
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Spotify player account error:', message);
        setState(prev => ({ ...prev, error: 'Account error. Premium required for Web Playback.' }));
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Spotify player playback error:', message);
        setState(prev => ({ ...prev, error: message }));
      });

      // Connect the player
      const connected = await player.connect();
      if (connected) {
        playerRef.current = player;
        console.log('Spotify Web Playback SDK connected successfully');
      } else {
        throw new Error('Failed to connect Spotify Web Playback SDK');
      }

    } catch (error) {
      console.error('Failed to initialize Spotify player:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize Spotify player. Using API fallback.',
        isConnected: false 
      }));
      
      // Fall back to API-based approach
      await initializeAudioContext();
    }
  }, [getAccessToken, state.volume, initializeSpotifySDK, connectAudioAnalyser]);



  // Get real-time audio data from Web Audio API
  const updateAudioData = useCallback(() => {
    if (analyserRef.current && state.isPlaying) {
      // Get real frequency data from the analyser
      const bufferLength = analyserRef.current.frequencyBinCount; // This will be 128 (fftSize/2)
      const frequencies = new Uint8Array(bufferLength);
      
      try {
        analyserRef.current.getByteFrequencyData(frequencies);
        
        // Calculate audio levels from frequency data
        const bassEnd = Math.floor(bufferLength * 0.1); // First 10% for bass
        const midStart = bassEnd;
        const midEnd = Math.floor(bufferLength * 0.7); // 10-70% for mids
        const trebleStart = midEnd; // 70-100% for treble
        
        // Calculate average levels for each frequency range
        let bassSum = 0, midSum = 0, trebleSum = 0;
        
        for (let i = 0; i < bassEnd; i++) {
          bassSum += frequencies[i];
        }
        
        for (let i = midStart; i < midEnd; i++) {
          midSum += frequencies[i];
        }
        
        for (let i = trebleStart; i < bufferLength; i++) {
          trebleSum += frequencies[i];
        }
        
        const bassLevel = bassSum / (bassEnd * 255); // Normalize to 0-1
        const midLevel = midSum / ((midEnd - midStart) * 255);
        const trebleLevel = trebleSum / ((bufferLength - trebleStart) * 255);
        
        // Calculate overall volume
        const totalSum = frequencies.reduce((sum, val) => sum + val, 0);
        const volume = totalSum / (bufferLength * 255);
        
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
        
      } catch (error) {
        // If real audio analysis fails, fall back to simulated data
        console.warn('Audio analysis failed, using simulated data:', error);
        generateSimulatedAudioData();
      }
    } else {
      // Generate simulated data when not playing or analyser not available
      generateSimulatedAudioData();
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  }, [state.isPlaying]);

  // Fallback simulated audio data
  const generateSimulatedAudioData = useCallback(() => {
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
  }, [state.isPlaying]);

  // Control playback - prefer Web Playback SDK, fallback to API
  const togglePlayback = useCallback(async () => {
    try {
      if (playerRef.current) {
        // Use Web Playback SDK
        await playerRef.current.togglePlay();
      } else {
        // Fallback to Spotify API
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
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Playback control unavailable' }));
    }
  }, [state.isPlaying, initializeAudioContext]);

  const setVolume = useCallback(async (volume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      
      if (playerRef.current) {
        // Use Web Playback SDK
        await playerRef.current.setVolume(clampedVolume);
        setState(prev => ({ ...prev, volume: clampedVolume, error: null }));
      } else {
        // Fallback to Spotify API
        const volumePercent = Math.round(clampedVolume * 100);
        
        const response = await fetch(`/api/spotify/me/player/volume?volume_percent=${volumePercent}`, {
          method: 'PUT',
        });

        if (response.ok || response.status === 204) {
          setState(prev => ({ ...prev, volume: clampedVolume, error: null }));
        }
      }
    } catch (error) {
      console.warn('Volume control unavailable:', error);
    }
  }, []);

  const skipToNext = useCallback(async () => {
    try {
      if (playerRef.current) {
        // Use Web Playback SDK
        await playerRef.current.nextTrack();
      } else {
        // Fallback to Spotify API
        const response = await fetch('/api/spotify/me/player/next', {
          method: 'POST',
        });

        if (response.ok || response.status === 204) {
          setTimeout(fetchCurrentTrack, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to skip track:', error);
    }
  }, [fetchCurrentTrack]);

  const skipToPrevious = useCallback(async () => {
    try {
      if (playerRef.current) {
        // Use Web Playback SDK
        await playerRef.current.previousTrack();
      } else {
        // Fallback to Spotify API
        const response = await fetch('/api/spotify/me/player/previous', {
          method: 'POST',
        });

        if (response.ok || response.status === 204) {
          setTimeout(fetchCurrentTrack, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
    }
  }, [fetchCurrentTrack]);

  // Initialize everything
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const initialize = async () => {
      // Try to initialize Spotify Web Playback SDK first
      try {
        await initializePlayer();
      } catch (error) {
        console.warn('Web Playback SDK failed, using API fallback:', error);
        // Fallback to API-based approach
        await initializeAudioContext();
        fetchCurrentTrack();
        interval = setInterval(fetchCurrentTrack, 5000);
      }
      
      // Start audio data updates
      updateAudioData();

      // Periodically try to connect to audio if not already connected
      const audioCheckInterval = setInterval(tryConnectToAudio, 5000);
      
      return () => clearInterval(audioCheckInterval);
    };

    initialize();

    return () => {
      if (interval) clearInterval(interval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [initializePlayer, initializeAudioContext, fetchCurrentTrack, updateAudioData]);

  return {
    ...state,
    togglePlayback,
    setVolume,
    skipToNext,
    skipToPrevious,
    refreshTrack: fetchCurrentTrack,
    hasRealAudio: !!sourceRef.current, // True if we have real audio connection
  };
}