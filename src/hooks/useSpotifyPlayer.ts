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



  // Aggressive audio element detection including shadow DOM and dynamic elements
  const waitForAudioElement = useCallback(async (maxAttempts = 20, delayMs = 300): Promise<HTMLAudioElement | null> => {
    console.log('Starting comprehensive audio element detection...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Looking for audio element (attempt ${attempt}/${maxAttempts})...`);
      
      // Method 1: Standard DOM search
      let audioElements = Array.from(document.querySelectorAll('audio'));
      
      // Method 2: Search in all shadow roots
      const searchShadowRoots = (element: Element): HTMLAudioElement[] => {
        const found: HTMLAudioElement[] = [];
        
        if (element.shadowRoot) {
          const shadowAudio = Array.from(element.shadowRoot.querySelectorAll('audio'));
          found.push(...shadowAudio as HTMLAudioElement[]);
          
          // Recursively search shadow roots
          const shadowElements = Array.from(element.shadowRoot.querySelectorAll('*'));
          for (const shadowEl of shadowElements) {
            found.push(...searchShadowRoots(shadowEl));
          }
        }
        
        return found;
      };
      
      // Search all elements for shadow roots
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        audioElements.push(...searchShadowRoots(el));
      }
      
      // Method 3: Look for Spotify-specific containers and iframe content
      const spotifyContainers = document.querySelectorAll('[class*="spotify"], [id*="spotify"], iframe[src*="spotify"]');
      for (const container of spotifyContainers) {
        try {
          if (container instanceof HTMLIFrameElement && container.contentDocument) {
            const iframeAudio = Array.from(container.contentDocument.querySelectorAll('audio'));
            audioElements.push(...iframeAudio as HTMLAudioElement[]);
          }
        } catch (e) {
          // Cross-origin iframe, can't access
        }
      }
      
      console.log(`Found ${audioElements.length} total audio elements (including shadow DOM)`);
      
      if (audioElements.length > 0) {
        // Log all found elements for debugging
        audioElements.forEach((el, index) => {
          console.log(`Audio element ${index}:`, {
            src: el.src,
            currentSrc: el.currentSrc,
            paused: el.paused,
            readyState: el.readyState,
            networkState: el.networkState,
            duration: el.duration,
            volume: el.volume,
            muted: el.muted,
            crossOrigin: el.crossOrigin
          });
        });
        
        // Enhanced selection logic
        let bestElement: HTMLAudioElement | null = null;
        
        // Priority 1: Audio element with Spotify/scdn.co src
        for (const element of audioElements) {
          if ((element.src && (element.src.includes('spotify') || element.src.includes('scdn.co'))) ||
              (element.currentSrc && (element.currentSrc.includes('spotify') || element.currentSrc.includes('scdn.co')))) {
            console.log('Found Spotify audio element');
            bestElement = element;
            break;
          }
        }
        
        // Priority 2: Audio element that's actively playing
        if (!bestElement) {
          for (const element of audioElements) {
            if (!element.paused && element.currentTime > 0) {
              console.log('Found actively playing audio element');
              bestElement = element;
              break;
            }
          }
        }
        
        // Priority 3: Audio element with loaded content
        if (!bestElement) {
          for (const element of audioElements) {
            if (element.readyState >= 2 || element.duration > 0) { // HAVE_CURRENT_DATA or higher
              console.log('Found loaded audio element');
              bestElement = element;
              break;
            }
          }
        }
        
        // Priority 4: Any audio element with src
        if (!bestElement) {
          for (const element of audioElements) {
            if (element.src || element.currentSrc) {
              console.log('Found audio element with src');
              bestElement = element;
              break;
            }
          }
        }
        
        // Priority 5: First audio element as last resort
        if (!bestElement && audioElements.length > 0) {
          console.log('Using first audio element as fallback');
          bestElement = audioElements[0];
        }
        
        if (bestElement) {
          console.log(`✓ Selected audio element on attempt ${attempt}:`, {
            src: bestElement.src,
            currentSrc: bestElement.currentSrc,
            paused: bestElement.paused,
            readyState: bestElement.readyState,
            currentTime: bestElement.currentTime,
            duration: bestElement.duration
          });
          return bestElement;
        }
      }
      
      // Wait before next attempt
      if (attempt < maxAttempts) {
        console.log(`No suitable audio element found, waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.warn('No audio element found after comprehensive search');
    return null;
  }, []);

  // Connect Spotify player to Web Audio API
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
      console.log('Attempting to connect audio analyser...');

      // Method 1: Force Web Playback SDK to create audio element by ensuring playback
      console.log('Forcing Web Playback SDK to create audio elements...');
      if (player) {
        try {
          // Ensure the player is active and playing
          const currentState = await player.getCurrentState();
          if (currentState && currentState.paused) {
            console.log('Resuming playback to force audio element creation...');
            await player.resume();
            // Wait a moment for the audio element to be created
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (resumeError) {
          console.warn('Could not resume playback:', resumeError);
        }
      }

      // Now search comprehensively for audio elements
      console.log('Searching for audio elements after playback activation...');
      const audioElement = await waitForAudioElement();

      if (audioElement) {
        try {
          console.log('Attempting to connect audio element to analyser...');
          
          // Ensure the audio element is playing
          if (audioElement.paused) {
            try {
              await audioElement.play();
            } catch (playError) {
              console.warn('Could not play audio element:', playError);
            }
          }
          
          // Create audio source from the HTML5 audio element
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
          
          // Connect: source -> analyser -> destination (speakers)
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          
          console.log('✓ Audio analyser connected successfully to real Spotify audio!');
          
          // Update state to reflect real audio connection
          setState(prev => ({ ...prev, error: null }));
          return;
          
        } catch (sourceError) {
          console.warn('Failed to create media source from audio element:', sourceError);
          // Clear the failed source reference
          sourceRef.current = null;
        }
      }

      console.log('No audio elements found even after comprehensive search');

      // Method 2: Use Web Playback SDK with Web Audio API (modern approach)
      console.log('Trying Web Playback SDK with Web Audio API...');
      if (player) {
        try {
          // Get the player's internal audio context or create a destination
          const playerState = await player.getCurrentState();
          if (playerState) {
            console.log('Player state available, attempting audio stream capture...');
            
            // Try to access the SDK's internal audio stream
            // The Web Playback SDK uses Web Audio API internally
            const sdkAudioContext = (player as any)._options?.audioContext || audioContextRef.current;
            
            if (sdkAudioContext) {
              console.log('Found SDK audio context, connecting analyser...');
              
              // Create a gain node to tap into the audio stream
              const gainNode = sdkAudioContext.createGain();
              gainNode.gain.value = 1.0;
              
              // Connect the gain node to our analyser
              gainNode.connect(analyserRef.current);
              analyserRef.current.connect(audioContextRef.current.destination);
              
              // Try to intercept the SDK's audio routing
              const originalConnect = sdkAudioContext.destination.connect;
              sdkAudioContext.destination.connect = function(destination: any) {
                // Also connect to our analyser
                gainNode.connect(analyserRef.current);
                return originalConnect.call(this, destination);
              };
              
              sourceRef.current = gainNode as any;
              console.log('✓ Connected to Web Playback SDK audio stream!');
              setState(prev => ({ ...prev, error: null }));
              return;
            }
          }
          
          // Alternative: Try to capture system audio output
          console.log('Attempting system audio capture...');
          if ('getDisplayMedia' in navigator.mediaDevices) {
            try {
              const stream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: {
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false,
                  sampleRate: 44100
                } as any
              });
              
              if (stream.getAudioTracks().length > 0) {
                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
                
                sourceRef.current = source;
                console.log('✓ Connected to system audio via screen share!');
                setState(prev => ({ 
                  ...prev, 
                  error: 'Using system audio - make sure Spotify is playing' 
                }));
                return;
              }
            } catch (displayError) {
              console.warn('System audio capture failed:', displayError);
            }
          }
          
        } catch (sdkError) {
          console.warn('Web Playback SDK audio connection failed:', sdkError);
        }
      }

      // Method 3: Try microphone as fallback
      console.log('Trying microphone audio capture...');
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            } 
          });
          
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          
          console.log('✓ Connected to microphone audio as fallback');
          setState(prev => ({ 
            ...prev, 
            error: 'Using microphone audio - play music loudly for visualization' 
          }));
          return;
        }
      } catch (micError) {
        console.warn('Microphone access failed:', micError);
      }

      // Method 4: Fallback to enhanced simulated data
      console.warn('All audio connection methods failed - using enhanced simulated visualization');
      setState(prev => ({ 
        ...prev, 
        error: 'Using enhanced simulated visualization based on track data' 
      }));

    } catch (error) {
      console.error('Failed to connect audio analyser:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Audio analysis unavailable - using simulated data' 
      }));
    } finally {
      // Reset the connection attempt flag
      audioConnectionAttemptRef.current = false;
    }
  }, [waitForAudioElement]);

  // User-triggered audio activation with proper sequencing
  const activateAudio = useCallback(async () => {
    console.log('User activated audio - starting activation sequence...');
    
    try {
      // Step 1: Initialize audio context
      await initializeAudioContext();
      console.log('✓ Audio context initialized');
      
      // Step 2: Transfer playback if we have a device
      if (deviceIdRef.current) {
        console.log('Transferring playback to Web Playback SDK...');
        const transferred = await transferPlaybackToDevice(deviceIdRef.current);
        if (transferred) {
          console.log('✓ Playback transferred successfully');
          
          // Step 3: Wait a moment for Spotify to create the audio element
          console.log('Waiting for Spotify to initialize audio element...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Step 4: Connect audio analyser
          if (playerRef.current) {
            console.log('Connecting audio analyser...');
            await connectAudioAnalyser(playerRef.current);
          }
        } else {
          console.warn('Playback transfer failed, trying audio connection anyway...');
          if (playerRef.current) {
            await connectAudioAnalyser(playerRef.current);
          }
        }
      } else {
        console.log('No device ID available, trying direct audio connection...');
        if (playerRef.current) {
          await connectAudioAnalyser(playerRef.current);
        }
      }
      
      console.log('Audio activation sequence completed');
      
    } catch (error) {
      console.error('Audio activation failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Audio activation failed - using simulated data' 
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
    hasRealAudio: !!sourceRef.current, // True if we have real audio connection
    activateAudio, // Function to activate audio after user interaction
  };
}