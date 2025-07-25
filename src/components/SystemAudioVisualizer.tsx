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

interface SystemAudioVisualizerProps {
  accessToken: string;
}

export default function SystemAudioVisualizer({ accessToken }: SystemAudioVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioMode, setAudioMode] = useState<'system' | 'preview' | 'fallback'>('fallback');
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | AudioBufferSourceNode | null>(null);

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
    const interval = setInterval(pollCurrentTrack, 2000);
    return () => clearInterval(interval);
  }, [accessToken]);

  // System audio capture with screen share
  const enableSystemAudio = async () => {
    try {
      // Request screen share with audio
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

      // Hide the tiny video element
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track available');
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 1024; // Higher resolution
      analyser.smoothingTimeConstant = 0.8;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;
      
      setAudioMode('system');
      setAudioEnabled(true);
      console.log('🔊 System audio capture enabled');

      // Handle stream end
      stream.getAudioTracks()[0].onended = () => {
        setAudioMode('fallback');
        setAudioEnabled(false);
        console.log('System audio capture ended');
      };

    } catch (error) {
      console.error('System audio capture failed:', error);
      alert('System audio capture failed. Make sure to:\n1. Select "Share audio" when prompted\n2. Choose the browser tab playing Spotify\n3. Allow audio sharing');
      tryPreviewAnalysis();
    }
  };

  const tryPreviewAnalysis = async () => {
    if (!currentTrack?.preview_url) {
      setAudioMode('fallback');
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      
      const response = await fetch(currentTrack.preview_url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      source.start();
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;
      
      setAudioMode('preview');
      setAudioEnabled(true);
      console.log('🎶 Preview audio analysis enabled');
    } catch (error) {
      console.error('Preview analysis failed:', error);
      setAudioMode('fallback');
    }
  };

  // Canvas visualization
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let frequencyData: Uint8Array | null = null;
      
      if (analyserRef.current && dataArrayRef.current && audioMode !== 'fallback') {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        frequencyData = dataArrayRef.current;
      }

      // Background gradient
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );

      if (audioMode === 'system') {
        gradient.addColorStop(0, `hsla(280, 80%, 60%, 0.4)`);
        gradient.addColorStop(1, `hsla(320, 60%, 40%, 0.1)`);
      } else if (audioMode === 'preview') {
        gradient.addColorStop(0, `hsla(60, 80%, 60%, 0.4)`);
        gradient.addColorStop(1, `hsla(120, 60%, 40%, 0.1)`);
      } else {
        gradient.addColorStop(0, `hsla(240, 80%, 60%, 0.3)`);
        gradient.addColorStop(1, `hsla(280, 60%, 40%, 0.1)`);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Frequency bars
      const numBars = frequencyData ? Math.min(frequencyData.length / 2, 128) : 64;
      const barWidth = canvas.width / numBars;
      const time = Date.now() * 0.001;

      for (let i = 0; i < numBars; i++) {
        let amplitude: number;
        
        if (frequencyData && audioMode !== 'fallback') {
          // Use real audio data with better scaling
          const dataIndex = Math.floor(i * (frequencyData.length / numBars));
          amplitude = (frequencyData[dataIndex] / 255) * 1.2;
        } else {
          // Fallback animation
          const frequency = i / numBars;
          amplitude = 0.6 + 
            Math.sin(time * 2 + frequency * 8) * 0.3 +
            Math.sin(time * 3 + frequency * 15) * 0.2;
        }

        const barHeight = Math.max(5, amplitude * canvas.height * 0.7);
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        // Color based on frequency and mode
        let hue: number;
        if (audioMode === 'system') {
          hue = (i / numBars * 120 + 280) % 360; // Purple spectrum
        } else if (audioMode === 'preview') {
          hue = (i / numBars * 120 + 60) % 360; // Yellow-green spectrum
        } else {
          hue = (i / numBars * 360 + 240) % 360; // Blue spectrum
        }
        
        const saturation = 70 + amplitude * 30;
        const lightness = 50 + amplitude * 40;

        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`;
        ctx.fillRect(x, y, barWidth - 2, barHeight);

        // Glow effect for real audio
        if (audioMode !== 'fallback') {
          ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
          ctx.shadowBlur = 20;
          ctx.fillRect(x, y, barWidth - 2, barHeight);
          ctx.shadowBlur = 0;
        }
      }

      // Central pulsing circle
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      let pulseRadius: number;
      if (frequencyData && audioMode !== 'fallback') {
        // Calculate average amplitude from lower frequencies (bass)
        const bassRange = Math.floor(frequencyData.length * 0.1);
        const bassSum = Array.from(frequencyData.slice(0, bassRange)).reduce((a, b) => a + b, 0);
        const bassAverage = bassSum / bassRange / 255;
        pulseRadius = 80 + bassAverage * 300;
      } else {
        pulseRadius = 80 + Math.sin(time * 2) * 40;
      }

      const circleGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
      
      if (audioMode === 'system') {
        circleGradient.addColorStop(0, `hsla(280, 80%, 70%, 0.8)`);
        circleGradient.addColorStop(1, `hsla(280, 80%, 70%, 0)`);
      } else if (audioMode === 'preview') {
        circleGradient.addColorStop(0, `hsla(60, 80%, 70%, 0.8)`);
        circleGradient.addColorStop(1, `hsla(60, 80%, 70%, 0)`);
      } else {
        circleGradient.addColorStop(0, `hsla(240, 80%, 70%, 0.6)`);
        circleGradient.addColorStop(1, `hsla(240, 80%, 70%, 0)`);
      }

      ctx.fillStyle = circleGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTrack, audioMode]);

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

  const getAudioModeInfo = () => {
    switch (audioMode) {
      case 'system':
        return { icon: '🔊', text: 'System audio analysis', color: 'text-purple-400' };
      case 'preview':
        return { icon: '🎶', text: 'Preview audio analysis', color: 'text-yellow-400' };
      default:
        return { icon: '🎨', text: 'Visual animation mode', color: 'text-blue-400' };
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

  const modeInfo = getAudioModeInfo();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Audio Controls */}
      <div className="absolute top-4 left-4 flex gap-2">
        {!audioEnabled && (
          <>
            <button
              onClick={enableSystemAudio}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm font-medium"
            >
              🔊 Capture System Audio
            </button>
            
            {currentTrack.preview_url && (
              <button
                onClick={tryPreviewAnalysis}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors text-sm font-medium"
              >
                🎶 Use Preview
              </button>
            )}
          </>
        )}
      </div>

      {/* Track Info */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute bottom-8 left-8 right-8 bg-black/40 backdrop-blur-lg rounded-2xl p-6 text-white"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={currentTrack.album.images[0]?.url}
                  alt={currentTrack.album.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold truncate">{currentTrack.name}</h3>
                <p className="text-gray-300 truncate">
                  {currentTrack.artists.map(a => a.name).join(', ')}
                </p>
                <p className="text-sm text-gray-400">{currentTrack.album.name}</p>
              </div>

              <div className="text-center">
                <div className={`text-2xl ${modeInfo.color}`}>{modeInfo.icon}</div>
                <div className={`text-xs ${modeInfo.color} font-medium`}>
                  {modeInfo.text}
                </div>
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-1">
                <div
                  className="bg-white rounded-full h-1 transition-all duration-1000"
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
      <div className="absolute top-4 right-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`} />
          {isPlaying ? 'Playing' : 'Paused'}
        </div>
      </div>
    </div>
  );
}