'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CurrentTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  progress_ms: number;
  preview_url?: string;
}

interface InstantVisualizerProps {
  accessToken: string;
}

export default function InstantVisualizer({ accessToken }: InstantVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioMode, setAudioMode] = useState<'spotify-sdk' | 'preview' | 'smart-fallback'>('smart-fallback');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [volume, setVolume] = useState(0.8);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // Real-time audio data
  const audioDataRef = useRef<number[]>(new Array(128).fill(0));
  const beatDetectionRef = useRef({ lastBeat: 0, threshold: 0, history: [] as number[] });

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const initializeSpotifySDK = async () => {
      if ((window as any).Spotify) {
        setupPlayer();
        return;
      }

      // Load Spotify SDK
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);

      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        setupPlayer();
      };
    };

    const setupPlayer = () => {
      const spotifyPlayer = new (window as any).Spotify.Player({
        name: 'Waveline Instant Visualizer',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: 1.0 // Full volume so users can hear the music
      });

      // Player events
      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('🎵 Spotify Player Ready! Device ID:', device_id);
        setDeviceId(device_id);
        setPlayer(spotifyPlayer);
        setAudioMode('spotify-sdk');
        setSdkStatus('ready');
        
        // Transfer playback to this device
        transferPlayback(device_id);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device has gone offline', device_id);
        setSdkStatus('error');
      });

      spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Spotify SDK initialization error:', message);
        setSdkStatus('error');
      });

      spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Spotify SDK authentication error:', message);
        setSdkStatus('error');
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        
        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        
        // Set up real-time audio analysis from SDK
        if (!state.paused && state.track_window.current_track) {
          setupSDKAudioAnalysis(spotifyPlayer);
          getAudioAnalysis(state.track_window.current_track.id);
        }
      });

      spotifyPlayer.connect();
    };

    initializeSpotifySDK();

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken]);

  // Transfer playback to our device
  const transferPlayback = async (deviceId: string) => {
    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false // Don't auto-play
        }),
      });
      console.log('✅ Playback transferred to Waveline');
    } catch (error) {
      console.error('Failed to transfer playback:', error);
    }
  };

  // Set up real-time audio analysis from Spotify SDK
  const setupSDKAudioAnalysis = async (spotifyPlayer: any) => {
    try {
      // Wait a bit for the audio element to be created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try multiple ways to find the audio element
      let audioElement = null;
      
      // Method 1: Look for any audio element
      audioElement = document.querySelector('audio');
      
      // Method 2: Look for Spotify-specific audio elements
      if (!audioElement) {
        audioElement = document.querySelector('[data-testid="audio-element"]') ||
                      document.querySelector('.spotify-audio') ||
                      document.querySelector('#spotify-player-audio');
      }
      
      // Method 3: Try to get from player internals (if available)
      if (!audioElement && spotifyPlayer._options) {
        audioElement = spotifyPlayer._options.getAudioElement?.();
      }

      if (audioElement && !sourceRef.current) {
        console.log('🎵 Found audio element:', audioElement);
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioElement);
        
        analyser.fftSize = 1024; // Higher resolution for better visualization
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        sourceRef.current = source;
        
        console.log('🚀 SDK Real-time audio analysis connected!');
        setAudioMode('spotify-sdk');
      } else {
        console.log('🎵 Audio element not found, using smart fallback');
        // Try system audio capture as fallback
        trySystemAudioCapture();
      }
    } catch (error) {
      console.error('SDK audio analysis setup failed:', error);
      trySystemAudioCapture();
    }
  };

  // Try system audio capture as fallback
  const trySystemAudioCapture = async () => {
    try {
      // @ts-ignore - getDisplayMedia with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        }
      });
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 1024;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;
      
      setAudioMode('preview'); // Use preview mode for system audio
      console.log('🔊 System audio capture enabled as fallback');
    } catch (error) {
      console.error('System audio capture failed:', error);
      setAudioMode('smart-fallback');
    }
  };

  // Get real-time audio analysis
  const getAudioAnalysis = async (trackId: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const analysis = await response.json();
        console.log('🎵 Got audio analysis:', analysis);
        processAudioAnalysis(analysis);
      } else if (response.status === 403) {
        console.log('Audio analysis not available (403), using smart fallback');
        // Use smart fallback when audio analysis is not available
        setAudioMode('smart-fallback');
      }
    } catch (error) {
      console.error('Failed to get audio analysis:', error);
      setAudioMode('smart-fallback');
    }
  };

  // Process Spotify's detailed audio analysis
  const processAudioAnalysis = (analysis: any) => {
    const { beats, segments, sections } = analysis;
    
    // Create real-time visualization data from Spotify's analysis
    if (beats && segments) {
      setAudioMode('spotify-sdk');
      console.log('🔥 Using Spotify audio analysis for INSTANT visualization');
    }
  };

  // Smart fallback with enhanced preview analysis
  const enableSmartFallback = async () => {
    if (!currentTrack?.preview_url) {
      // Generate smart procedural visualization
      setAudioMode('smart-fallback');
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(currentTrack.preview_url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Analyze the entire preview at once for instant response
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createBufferSource();
      
      source.buffer = audioBuffer;
      analyser.fftSize = 2048;
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      source.start();
      setAudioMode('preview');
      console.log('🎶 Using enhanced preview analysis');
      
    } catch (error) {
      console.error('Preview analysis failed:', error);
      setAudioMode('smart-fallback');
    }
  };

  // INSTANT beat detection
  const detectBeat = (audioData: number[]): boolean => {
    const bassRange = audioData.slice(0, 16);
    const bassLevel = bassRange.reduce((a, b) => a + b, 0) / bassRange.length;
    
    const detection = beatDetectionRef.current;
    detection.history.push(bassLevel);
    
    if (detection.history.length > 10) {
      detection.history.shift();
    }
    
    const average = detection.history.reduce((a, b) => a + b, 0) / detection.history.length;
    detection.threshold = average * 1.3;
    
    const now = Date.now();
    if (bassLevel > detection.threshold && now - detection.lastBeat > 150) {
      detection.lastBeat = now;
      return true;
    }
    
    return false;
  };

  // INSTANT visualization with zero delay
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let beatFlash = 0;

    const animate = () => {
      // Minimal fade for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const time = Date.now() * 0.001;
      let audioData: number[];

      // Get real-time audio data
      if (analyserRef.current && dataArrayRef.current && (audioMode === 'spotify-sdk' || audioMode === 'preview')) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        audioData = Array.from(dataArrayRef.current).map(v => v / 255);
      } else {
        // Smart procedural generation based on track progress
        const progress = currentTrack ? (currentTrack.progress_ms / currentTrack.duration_ms) : 0;
        audioData = generateSmartAudio(time, progress);
      }

      // Update audio data reference
      audioDataRef.current = audioData;

      // Beat detection
      const beat = detectBeat(audioData);
      if (beat) {
        beatFlash = 1;
      }
      beatFlash *= 0.9; // Fade beat flash

      // INSTANT responsive visualization
      drawInstantVisualization(ctx, canvas, audioData, time, beatFlash);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTrack, audioMode]);

  // Generate smart audio data based on track characteristics
  const generateSmartAudio = (time: number, progress: number): number[] => {
    return Array.from({ length: 128 }, (_, i) => {
      const freq = i / 128;
      const intensity = 0.3 + progress * 0.4; // Build intensity over time
      
      return (
        Math.sin(time * 3 + freq * 12) * intensity * 0.4 +
        Math.sin(time * 2 + freq * 8) * intensity * 0.3 +
        Math.sin(time * 4 + freq * 16) * intensity * 0.2 +
        Math.sin(time * 1.5 + freq * 6) * intensity * 0.1
      ) * 0.5 + 0.3;
    });
  };

  // INSTANT visualization drawing
  const drawInstantVisualization = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    audioData: number[], 
    time: number, 
    beatFlash: number
  ) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Beat flash background
    if (beatFlash > 0.1) {
      ctx.save();
      ctx.globalAlpha = beatFlash * 0.1;
      ctx.fillStyle = `hsl(${time * 50 % 360}, 80%, 60%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Instant frequency bars
    const numBars = 64;
    const barWidth = canvas.width / numBars;
    
    for (let i = 0; i < numBars; i++) {
      const dataIndex = Math.floor((i / numBars) * (audioData.length - 1));
      const amplitude = Math.max(0, Math.min(1, audioData[dataIndex] || 0));
      
      const barHeight = Math.max(1, amplitude * canvas.height * 0.8);
      const x = i * barWidth;
      const y = Math.max(0, canvas.height - barHeight);
      
      const hue = (i * 5 + time * 30) % 360;
      const brightness = Math.max(10, Math.min(90, 50 + amplitude * 40 + (beatFlash || 0) * 30));
      
      // Main bar
      ctx.fillStyle = `hsl(${hue}, 80%, ${brightness}%)`;
      ctx.fillRect(x, y, Math.max(1, barWidth - 2), barHeight);
      
      // Glow effect
      ctx.shadowColor = `hsl(${hue}, 80%, ${brightness}%)`;
      ctx.shadowBlur = Math.max(0, 10 + (beatFlash || 0) * 20);
      ctx.fillRect(x, y, Math.max(1, barWidth - 2), barHeight);
      ctx.shadowBlur = 0;
    }

    // Central pulsing orb
    const bassLevel = audioData.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
    const safeOrbRadius = Math.max(20, Math.min(300, 60 + (bassLevel || 0) * 150 + (beatFlash || 0) * 100));
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, safeOrbRadius);
    gradient.addColorStop(0, `hsla(${time * 40 % 360}, 90%, 70%, ${0.8 + beatFlash * 0.2})`);
    gradient.addColorStop(1, `hsla(${time * 40 % 360}, 90%, 70%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, safeOrbRadius, 0, Math.PI * 2);
    ctx.fill();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Playback controls
  const togglePlayback = () => {
    if (player) {
      player.togglePlay();
    }
  };

  const nextTrack = () => {
    if (player) {
      player.nextTrack();
    }
  };

  const previousTrack = () => {
    if (player) {
      player.previousTrack();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (player) {
      player.setVolume(newVolume);
    }
  };

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold mb-2">No music playing</h2>
          <p className="text-gray-300 mb-4">Start playing music on Spotify to see instant visualizations</p>
          {deviceId && (
            <p className="text-sm text-green-400">✅ Waveline device ready for instant visualization</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Controls */}
      <div className="absolute top-4 left-4 flex gap-2">
        {audioMode === 'smart-fallback' && (
          <>
            <button
              onClick={trySystemAudioCapture}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm font-medium backdrop-blur-sm"
            >
              🔊 Capture System Audio
            </button>
            
            {currentTrack?.preview_url && (
              <button
                onClick={enableSmartFallback}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors text-sm font-medium backdrop-blur-sm"
              >
                🎶 Preview Analysis
              </button>
            )}
          </>
        )}
        
        {sdkStatus === 'loading' && (
          <div className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium backdrop-blur-sm">
            🔄 Loading SDK...
          </div>
        )}
      </div>

      {/* Track Info */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute bottom-8 left-8 right-8 bg-black/30 backdrop-blur-xl rounded-2xl p-6 text-white border border-white/10"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={currentTrack.album.images[0]?.url}
                  alt={currentTrack.album.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold truncate">{currentTrack.name}</h3>
                <p className="text-gray-300 truncate text-sm">
                  {currentTrack.artists.map(a => a.name).join(', ')}
                </p>
                <p className="text-xs text-gray-400">{currentTrack.album.name}</p>
              </div>

              <div className="text-center">
                <div className="text-xl">
                  {audioMode === 'spotify-sdk' ? '🚀' : 
                   audioMode === 'preview' ? '🔊' : '⚡'}
                </div>
                <div className="text-xs text-white/70 font-medium">
                  {audioMode === 'spotify-sdk' ? 'SDK Audio' : 
                   audioMode === 'preview' ? 'System Audio' : 'Smart Mode'}
                </div>
                {analyserRef.current && (
                  <div className="text-xs text-green-400 font-bold animate-pulse">
                    LIVE
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-3">
                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-white/20 rounded-lg appearance-none slider"
                  />
                </div>

                {/* Previous Track */}
                <button
                  onClick={previousTrack}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Previous Track"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlayback}
                  className="p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Next Track */}
                <button
                  onClick={nextTrack}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Next Track"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Toggle Fullscreen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-white/10 rounded-full h-1">
                <div
                  className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-full h-1 transition-all duration-1000"
                  style={{
                    width: `${(currentTrack.progress_ms / currentTrack.duration_ms) * 100}%`
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <div className="absolute top-4 right-4 flex gap-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`} />
          {isPlaying ? 'Playing' : 'Paused'}
        </div>
        
        {deviceId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Instant Mode
          </div>
        )}
      </div>
    </div>
  );
}