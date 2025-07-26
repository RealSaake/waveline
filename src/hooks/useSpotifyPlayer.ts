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
    audioContextReady: boolean;
    needsUserInteraction: boolean;
  }>({
    currentTrack: null,
    audioData: null,
    isPlaying: false,
    isConnected: false,
    error: null,
    volume: 0.7,
    audioContextReady: false,
    needsUserInteraction: true,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const sdkLoadedRef = useRef<boolean>(false);
  const deviceIdRef = useRef<string | null>(null);
  const audioConnectionAttemptRef = useRef<boolean>(false);

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

  // Initialize audio context and analyser (requires user interaction)
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

      setState(prev => ({ 
        ...prev, 
        audioContextReady: true, 
        needsUserInteraction: false 
      }));
      
      console.log('Audio context initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize audio context' 
      }));
    }
  }, []);

  // Transfer playback to Web Playback SDK device
  const transferPlaybackToDevice = useCallback(async (deviceId: string) => {
    try {
      console.log('Transferring playback to device:', deviceId);
      
      const response = await fetch('/api/spotify/me/player/transfer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: true,
        }),
      });

      if (response.ok || response.status === 204) {
        console.log('Playback transferred successfully to Web Playback SDK');
        setState(prev => ({ ...prev, error: null }));
        return true;
      } else {
        console.error('Failed to transfer playback:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error transferring playback:', error);
      return false;
    }
  }, []);





  // Connect to real audio using modern tab audio capture
  const connectAudioAnalyser = useCallback(async (player?: SpotifyPlayer) => {
    try {
      // Don't initialize audio context automatically - wait for user interaction
      if (!audioContextRef.current || !analyserRef.current) {
        console.log('Audio context not ready - user interaction required');
        return;
      }

      if (sourceRef.current) {
        console.log('Audio analyser already connected');
        return;
      }

      // Prevent multiple simultaneous connection attempts
      if (audioConnectionAttemptRef.current) {
        console.log('Audio connection attempt already in progress, skipping...');
        return;
      }

      audioConnectionAttemptRef.current = true;
      console.log('Starting modern audio capture...');

      // Method 1: Capture tab audio using getDisplayMedia (MODERN APPROACH)
      console.log('Attempting to capture tab audio with getDisplayMedia...');
      try {
        if ('getDisplayMedia' in navigator.mediaDevices) {
          // Request tab audio capture
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: false,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 44100,
              channelCount: 2
            } as any
          });
          
          if (stream.getAudioTracks().length > 0) {
            console.log('✓ Got tab audio stream, connecting to analyser...');
            
            // Create audio source from the captured stream
            const source = audioContextRef.current.createMediaStreamSource(stream);
            
            // Connect: captured audio -> analyser -> speakers
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
            
            sourceRef.current = source;
            
            console.log('✓ Successfully connected to real tab audio!');
            setState(prev => ({ 
              ...prev, 
              error: null 
            }));
            return;
          }
        }
      } catch (displayError) {
        console.warn('Tab audio capture failed:', displayError);
        
        // Check if user denied permission
        if (displayError.name === 'NotAllowedError') {
          setState(prev => ({ 
            ...prev, 
            error: 'Audio capture permission denied - using simulated visualization' 
          }));
        }
      }

      // Method 2: Fallback to microphone (for testing)
      console.log('Trying microphone as fallback...');
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 44100
            } 
          });
          
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          
          sourceRef.current = source;
          
          console.log('✓ Connected to microphone audio as fallback');
          setState(prev => ({ 
            ...prev, 
            error: 'Using microphone - play Spotify loudly for visualization' 
          }));
          return;
        }
      } catch (micError) {
        console.warn('Microphone access failed:', micError);
      }

      // Method 3: Fallback to simulated data
      console.warn('All real audio methods failed - using simulated visualization');
      setState(prev => ({ 
        ...prev, 
        error: 'No audio access - using simulated visualization' 
      }));

    } catch (error) {
      console.error('Failed to connect audio analyser:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Audio connection failed - using simulated data' 
      }));
    } finally {
      // Reset the connection attempt flag
      audioConnectionAttemptRef.current = false;
    }
  }, []);

  // User-triggered audio activation - the key user gesture
  const activateAudio = useCallback(async () => {
    console.log('🚀 User activated audio visualization...');
    
    try {
      // Step 1: Initialize audio context (requires user gesture)
      await initializeAudioContext();
      console.log('✓ Audio context ready');
      
      // Step 2: Ensure we have an active Spotify device
      if (deviceIdRef.current) {
        console.log('Ensuring playback is on this device...');
        const transferred = await transferPlaybackToDevice(deviceIdRef.current);
        if (transferred) {
          console.log('✓ This tab is now the active Spotify device');
        }
      }
      
      // Step 3: Connect to real audio (this will prompt for tab audio sharing)
      console.log('Connecting to audio stream...');
      await connectAudioAnalyser(playerRef.current);
      
      console.log('✅ Audio visualization activated!');
      
    } catch (error) {
      console.error('Audio activation failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Audio activation failed - check permissions' 
      }));
    }
  }, [initializeAudioContext, transferPlaybackToDevice, connectAudioAnalyser]);

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
        volume: 0.5, // Use a safe default volume
      });

      // Player event listeners
      player.addListener('ready', async ({ device_id }) => {
        console.log('Spotify player ready with device ID:', device_id);
        deviceIdRef.current = device_id;
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        
        // Transfer playback to this device to make SDK controls work instantly
        const transferred = await transferPlaybackToDevice(device_id);
        if (transferred) {
          console.log('Web Playback SDK is now the active device - instant controls enabled!');
        }
        
        // Only try to connect audio if audio context is already ready (user has interacted)
        if (audioContextRef.current && state.audioContextReady) {
          setTimeout(() => connectAudioAnalyser(player), 1000);
        } else {
          console.log('Audio context not ready - waiting for user interaction');
        }
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.log('Spotify player not ready with device ID:', device_id);
        setState(prev => ({ ...prev, isConnected: false }));
      });

      player.addListener('player_state_changed', async (state) => {
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

        // Try to connect audio analyser when music starts playing (only if audio context is ready)
        if (!state.paused && !sourceRef.current && audioContextRef.current) {
          console.log('Music started playing, attempting audio connection...');
          // Give Spotify more time to create the audio element when playback starts
          setTimeout(async () => {
            await connectAudioAnalyser(player);
          }, 2000);
        }
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
  }, [getAccessToken, initializeSpotifySDK, connectAudioAnalyser, transferPlaybackToDevice]);



  // Enhanced simulated audio data based on track information
  const generateSimulatedAudioData = useCallback(() => {
    if (state.isPlaying && state.currentTrack) {
      // Generate more realistic audio visualization data based on track info
      const frequencies = new Uint8Array(128);
      const time = Date.now() / 1000;
      const trackProgress = state.currentTrack.progress_ms / state.currentTrack.duration_ms;
      
      // Create different patterns based on track name/artist for variety
      const trackSeed = state.currentTrack.name.length + state.currentTrack.artists.join('').length;
      const artistVariation = trackSeed % 5;
      
      for (let i = 0; i < frequencies.length; i++) {
        // Base frequency pattern
        let value = Math.sin(time * (2 + artistVariation * 0.5) + i * 0.1) * 40;
        
        // Add track-specific variations
        value += Math.sin(time * (3 + trackSeed * 0.01) + i * 0.05) * 30;
        
        // Add some progression based on track progress
        value += Math.sin(trackProgress * Math.PI * 2 + i * 0.02) * 20;
        
        // Add randomness for realism
        value += (Math.random() - 0.5) * 25;
        
        // Normalize to 0-255 range
        frequencies[i] = Math.max(0, Math.min(255, value + 120));
      }

      // Create dynamic levels that change with the track
      const bassLevel = (Math.sin(time * (2 + artistVariation)) * 0.3 + 0.5) * (0.7 + trackProgress * 0.3);
      const midLevel = (Math.sin(time * (2.5 + artistVariation * 0.3)) * 0.3 + 0.5) * (0.6 + Math.sin(trackProgress * Math.PI) * 0.4);
      const trebleLevel = (Math.sin(time * (3 + artistVariation * 0.7)) * 0.3 + 0.5) * (0.5 + trackProgress * 0.5);

      setState(prev => ({
        ...prev,
        audioData: {
          frequencies,
          volume: 0.5 + Math.sin(time * 1.5) * 0.2 + trackProgress * 0.3,
          bassLevel: Math.max(0, Math.min(1, bassLevel)),
          midLevel: Math.max(0, Math.min(1, midLevel)),
          trebleLevel: Math.max(0, Math.min(1, trebleLevel)),
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
  }, [state.isPlaying, state.currentTrack]);

  // Get real-time audio data from Web Audio API or fallback to simulated
  const updateAudioData = useCallback(() => {
    const hasRealAudio = !!sourceRef.current && analyserRef.current;
    
    if (hasRealAudio && state.isPlaying) {
      // Use real audio analysis
      const bufferLength = analyserRef.current.frequencyBinCount; // 128 frequency bins
      const frequencies = new Uint8Array(bufferLength);
      
      try {
        analyserRef.current.getByteFrequencyData(frequencies);
        
        // Calculate audio levels from real frequency data
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
        console.warn('Real audio analysis failed, falling back to simulated:', error);
        generateSimulatedAudioData();
      }
    } else {
      // Use simulated data when no real audio or not playing
      generateSimulatedAudioData();
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  }, [state.isPlaying, generateSimulatedAudioData]);

  // Control playback - prefer Web Playback SDK, fallback to API
  const togglePlayback = useCallback(async () => {
    try {
      if (playerRef.current && deviceIdRef.current) {
        // Use Web Playback SDK (instant)
        console.log('Using Web Playback SDK for instant playback control');
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
      const volumePercent = Math.round(clampedVolume * 100);
      
      // Try Web Playback SDK first (instant, no network delay)
      if (playerRef.current && deviceIdRef.current) {
        try {
          console.log(`Setting volume to ${volumePercent}% via Web Playback SDK (instant)`);
          await playerRef.current.setVolume(clampedVolume);
          setState(prev => ({ ...prev, volume: clampedVolume, error: null }));
          console.log(`Volume set instantly to ${volumePercent}%`);
          return;
        } catch (sdkError) {
          console.warn('Web Playback SDK volume failed, falling back to API:', sdkError);
        }
      }
      
      // Fallback to Spotify API (has network delay)
      console.log(`Setting volume to ${volumePercent}% via API (fallback)`);
      const response = await fetch(`/api/spotify/me/player/volume?volume_percent=${volumePercent}`, {
        method: 'PUT',
      });

      if (response.ok || response.status === 204) {
        setState(prev => ({ ...prev, volume: clampedVolume, error: null }));
        console.log(`Volume set successfully to ${volumePercent}% via API`);
      } else {
        console.error(`Volume API failed with status ${response.status}:`, await response.text());
        setState(prev => ({ ...prev, error: 'Volume control unavailable' }));
      }
    } catch (error) {
      console.warn('Volume control unavailable:', error);
      setState(prev => ({ ...prev, error: 'Volume control unavailable' }));
    }
  }, []);

  const skipToNext = useCallback(async () => {
    try {
      if (playerRef.current && deviceIdRef.current) {
        // Use Web Playback SDK (instant)
        console.log('Using Web Playback SDK for instant track skip');
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
      if (playerRef.current && deviceIdRef.current) {
        // Use Web Playback SDK (instant)
        console.log('Using Web Playback SDK for instant previous track');
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
    hasRealAudio: !!sourceRef.current && !!analyserRef.current, // True if we have real audio connection
    activateAudio, // Function to activate audio after user interaction
  };
}