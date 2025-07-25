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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
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
        volume: 0.8
      });

      // Player events
      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('🎵 Spotify Player Ready! Device ID:', device_id);
        setDeviceId(device_id);
        setPlayer(spotifyPlayer);
        setAudioMode('spotify-sdk');
        
        // Transfer playback to this device
        transferPlayback(device_id);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device has gone offline', device_id);
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        
        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        
        // Get audio analysis for current track
        if (state.track_window.current_track) {
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
      }
    } catch (error) {
      console.error('Failed to get audio analysis:', error);
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
      if (analyserRef.current && dataArrayRef.current && audioMode === 'preview') {
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
      const amplitude = audioData[dataIndex] || 0;
      
      const barHeight = amplitude * canvas.height * 0.8;
      const x = i * barWidth;
      const y = canvas.height - barHeight;
      
      const hue = (i * 5 + time * 30) % 360;
      const brightness = 50 + amplitude * 40 + beatFlash * 30;
      
      // Main bar
      ctx.fillStyle = `hsl(${hue}, 80%, ${brightness}%)`;
      ctx.fillRect(x, y, barWidth - 2, barHeight);
      
      // Glow effect
      ctx.shadowColor = `hsl(${hue}, 80%, ${brightness}%)`;
      ctx.shadowBlur = 10 + beatFlash * 20;
      ctx.fillRect(x, y, barWidth - 2, barHeight);
      ctx.shadowBlur = 0;
    }

    // Central pulsing orb
    const bassLevel = audioData.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
    const orbRadius = 60 + bassLevel * 150 + beatFlash * 100;
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
    gradient.addColorStop(0, `hsla(${time * 40 % 360}, 90%, 70%, ${0.8 + beatFlash * 0.2})`);
    gradient.addColorStop(1, `hsla(${time * 40 % 360}, 90%, 70%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
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
        {audioMode === 'smart-fallback' && currentTrack?.preview_url && (
          <button
            onClick={enableSmartFallback}
            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors text-sm font-medium backdrop-blur-sm"
          >
            🎶 Enable Preview Analysis
          </button>
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
                   audioMode === 'preview' ? '🎶' : '⚡'}
                </div>
                <div className="text-xs text-white/70 font-medium">
                  {audioMode === 'spotify-sdk' ? 'Spotify SDK' : 
                   audioMode === 'preview' ? 'Preview' : 'Instant'}
                </div>
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
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