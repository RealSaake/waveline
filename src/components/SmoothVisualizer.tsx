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

interface SmoothVisualizerProps {
  accessToken: string;
}

export default function SmoothVisualizer({ accessToken }: SmoothVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioMode, setAudioMode] = useState<'system' | 'preview' | 'fallback'>('fallback');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [visualMode, setVisualMode] = useState<'waves' | 'orbs' | 'flow' | 'bloom'>('waves');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | AudioBufferSourceNode | null>(null);
  
  // Smooth animation state
  const smoothDataRef = useRef<number[]>([]);
  const timeRef = useRef<number>(0);

  // Poll for currently playing track
  useEffect(() => {
    const pollCurrentTrack = async () => {
      try {
        const response = await fetch('/api/currently-playing', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentTrack(data.track);
          setIsPlaying(data.isPlaying);
        }
      } catch (error) {
        console.error('Failed to get currently playing:', error);
      }
    };

    pollCurrentTrack();
    const interval = setInterval(pollCurrentTrack, 3000); // Less frequent polling
    return () => clearInterval(interval);
  }, [accessToken]);

  // System audio capture
  const enableSystemAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { max: 1 },
          height: { max: 1 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) videoTrack.stop();

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track available');
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512; // Lower for smoother performance
      analyser.smoothingTimeConstant = 0.85; // More smoothing
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;
      
      // Initialize smooth data array
      smoothDataRef.current = new Array(bufferLength).fill(0);
      
      setAudioMode('system');
      setAudioEnabled(true);
      console.log('🔊 Smooth audio analysis enabled');

      stream.getAudioTracks()[0].onended = () => {
        setAudioMode('fallback');
        setAudioEnabled(false);
      };

    } catch (error) {
      console.error('System audio capture failed:', error);
      alert('System audio capture failed. Make sure to:\n1. Select "Share audio" when prompted\n2. Choose the browser tab playing Spotify\n3. Allow audio sharing');
    }
  };

  // Smooth interpolation function
  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

  // Get smooth audio data
  const getSmoothAudioData = (): number[] => {
    if (!analyserRef.current || !dataArrayRef.current || audioMode === 'fallback') {
      // Generate smooth fallback data
      const time = timeRef.current * 0.001;
      return Array.from({ length: 64 }, (_, i) => {
        const freq = i / 64;
        return (
          Math.sin(time * 2 + freq * 8) * 0.3 +
          Math.sin(time * 3 + freq * 12) * 0.2 +
          Math.sin(time * 1.5 + freq * 6) * 0.1 + 0.4
        ) * 0.5 + 0.3;
      });
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Smooth the data over time
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const targetValue = dataArrayRef.current[i] / 255;
      smoothDataRef.current[i] = lerp(smoothDataRef.current[i], targetValue, 0.15);
    }

    return smoothDataRef.current;
  };

  // Smooth visualization
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      timeRef.current = Date.now();
      
      // Smooth fade instead of clear
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const audioData = getSmoothAudioData();
      const time = timeRef.current * 0.001;

      // Calculate smooth audio metrics
      const bassLevel = audioData.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
      const midLevel = audioData.slice(8, 32).reduce((a, b) => a + b, 0) / 24;
      const trebleLevel = audioData.slice(32).reduce((a, b) => a + b, 0) / 32;

      if (visualMode === 'waves') {
        drawWaves(ctx, canvas, audioData, time, bassLevel, midLevel, trebleLevel);
      } else if (visualMode === 'orbs') {
        drawOrbs(ctx, canvas, audioData, time, bassLevel, midLevel, trebleLevel);
      } else if (visualMode === 'flow') {
        drawFlow(ctx, canvas, audioData, time, bassLevel, midLevel, trebleLevel);
      } else if (visualMode === 'bloom') {
        drawBloom(ctx, canvas, audioData, time, bassLevel, midLevel, trebleLevel);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTrack, audioMode, visualMode]);

  // Wave visualization
  const drawWaves = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audioData: number[], time: number, bass: number, mid: number, treble: number) => {
    const centerY = canvas.height / 2;
    const numWaves = 5;

    for (let wave = 0; wave < numWaves; wave++) {
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${(wave * 60 + time * 20) % 360}, 70%, 60%, ${0.3 - wave * 0.05})`;
      ctx.lineWidth = 3 - wave * 0.3;

      for (let x = 0; x <= canvas.width; x += 4) {
        const progress = x / canvas.width;
        const audioIndex = Math.floor(progress * (audioData.length - 1));
        const amplitude = audioData[audioIndex] || 0;
        
        const waveOffset = wave * 20;
        const y = centerY + 
          Math.sin(progress * 8 + time * 2 + waveOffset) * amplitude * 100 +
          Math.sin(progress * 16 + time * 3 + waveOffset) * amplitude * 50 +
          Math.sin(progress * 32 + time * 1.5 + waveOffset) * amplitude * 25;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
  };

  // Orb visualization
  const drawOrbs = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audioData: number[], time: number, bass: number, mid: number, treble: number) => {
    const numOrbs = 12;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < numOrbs; i++) {
      const angle = (i / numOrbs) * Math.PI * 2 + time * 0.5;
      const audioIndex = Math.floor((i / numOrbs) * (audioData.length - 1));
      const amplitude = audioData[audioIndex] || 0;
      
      const radius = 200 + amplitude * 300;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const orbSize = 20 + amplitude * 40;
      const hue = (i * 30 + time * 30) % 360;
      
      // Glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, orbSize * 2);
      gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${amplitude * 0.8})`);
      gradient.addColorStop(1, `hsla(${hue}, 80%, 70%, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, orbSize * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Core orb
      ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${amplitude})`;
      ctx.beginPath();
      ctx.arc(x, y, orbSize, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Flow visualization
  const drawFlow = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audioData: number[], time: number, bass: number, mid: number, treble: number) => {
    const numLines = 8;
    
    for (let line = 0; line < numLines; line++) {
      const lineY = (canvas.height / (numLines + 1)) * (line + 1);
      const hue = (line * 45 + time * 20) % 360;
      
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.6)`;
      ctx.lineWidth = 2;
      
      for (let x = 0; x <= canvas.width; x += 3) {
        const progress = x / canvas.width;
        const audioIndex = Math.floor(progress * (audioData.length - 1));
        const amplitude = audioData[audioIndex] || 0;
        
        const flowOffset = time * 100 + line * 50;
        const y = lineY + 
          Math.sin((x + flowOffset) * 0.01) * amplitude * 60 +
          Math.sin((x + flowOffset) * 0.02) * amplitude * 30;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
  };

  // Bloom visualization
  const drawBloom = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audioData: number[], time: number, bass: number, mid: number, treble: number) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numPetals = 16;
    
    for (let petal = 0; petal < numPetals; petal++) {
      const angle = (petal / numPetals) * Math.PI * 2;
      const audioIndex = Math.floor((petal / numPetals) * (audioData.length - 1));
      const amplitude = audioData[audioIndex] || 0;
      
      const length = 100 + amplitude * 200;
      const width = 20 + amplitude * 30;
      const hue = (petal * 22.5 + time * 30) % 360;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + time * 0.5);
      
      // Petal gradient
      const gradient = ctx.createLinearGradient(0, 0, length, 0);
      gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${amplitude * 0.8})`);
      gradient.addColorStop(1, `hsla(${hue}, 80%, 70%, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(length / 2, 0, length / 2, width / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const getVisualModeInfo = () => {
    switch (visualMode) {
      case 'waves':
        return { icon: '🌊', text: 'Smooth Waves' };
      case 'orbs':
        return { icon: '🔮', text: 'Floating Orbs' };
      case 'flow':
        return { icon: '🌀', text: 'Flow Lines' };
      case 'bloom':
        return { icon: '🌸', text: 'Bloom Petals' };
      default:
        return { icon: '🌊', text: 'Smooth Waves' };
    }
  };

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold mb-2">No music playing</h2>
          <p className="text-gray-300">Start playing music on Spotify to see visualizations</p>
        </div>
      </div>
    );
  }

  const modeInfo = getVisualModeInfo();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Controls */}
      <div className="absolute top-4 left-4 flex gap-2">
        {!audioEnabled && (
          <button
            onClick={enableSystemAudio}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm font-medium backdrop-blur-sm"
          >
            🔊 Enable Audio
          </button>
        )}
        
        {/* Visual Mode Selector */}
        <div className="flex gap-1 bg-black/20 backdrop-blur-sm rounded-lg p-1">
          {(['waves', 'orbs', 'flow', 'bloom'] as const).map((mode) => {
            const modeInfo = mode === 'waves' ? { icon: '🌊' } :
                            mode === 'orbs' ? { icon: '🔮' } :
                            mode === 'flow' ? { icon: '🌀' } :
                            { icon: '🌸' };
            
            return (
              <button
                key={mode}
                onClick={() => setVisualMode(mode)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  visualMode === mode
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {modeInfo.icon}
              </button>
            );
          })}
        </div>
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
                <div className="text-xl">{modeInfo.icon}</div>
                <div className="text-xs text-white/70 font-medium">
                  {modeInfo.text}
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
        
        {audioEnabled && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Live Audio
          </div>
        )}
      </div>
    </div>
  );
}