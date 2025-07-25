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

interface RealTimeAudioVisualizerProps {
  accessToken: string;
}

export default function RealTimeAudioVisualizer({ accessToken }: RealTimeAudioVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioMode, setAudioMode] = useState<'microphone' | 'preview' | 'fallback'>('fallback');
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
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
    const interval = setInterval(pollCurrentTrack, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [accessToken]);

  // Initialize audio analysis
  const initMicrophoneAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;
      
      setAudioMode('microphone');
      console.log('🎤 Microphone audio analysis initialized');
    } catch (error) {
      console.error('Microphone access denied:', error);
      setMicPermission('denied');
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
      
      // Fetch and decode audio
      const response = await fetch(currentTrack.preview_url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      
      analyser.fftSize = 256;
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
      console.log('🎵 Preview audio analysis initialized');
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

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let frequencyData: Uint8Array | null = null;
      
      // Get real audio data if available
      if (analyserRef.current && dataArrayRef.current && audioMode !== 'fallback') {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        frequencyData = dataArrayRef.current;
      }

      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );

      if (audioMode === 'microphone') {
        gradient.addColorStop(0, `hsla(120, 80%, 60%, 0.4)`); // Green for mic
        gradient.addColorStop(1, `hsla(180, 60%, 40%, 0.1)`);
      } else if (audioMode === 'preview') {
        gradient.addColorStop(0, `hsla(60, 80%, 60%, 0.4)`); // Yellow for preview
        gradient.addColorStop(1, `hsla(120, 60%, 40%, 0.1)`);
      } else {
        gradient.addColorStop(0, `hsla(240, 80%, 60%, 0.3)`); // Blue for fallback
        gradient.addColorStop(1, `hsla(280, 60%, 40%, 0.1)`);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars
      const numBars = frequencyData ? Math.min(frequencyData.length, 128) : 128;
      const barWidth = canvas.width / numBars;
      const time = Date.now() * 0.001;

      for (let i = 0; i < numBars; i++) {
        let amplitude: number;
        
        if (frequencyData && audioMode !== 'fallback') {
          // Use real audio data
          amplitude = frequencyData[i] / 255;
        } else {
          // Use fallback animation
          const frequency = i / numBars;
          amplitude = 0.7 * 0.8 +
            Math.sin(time * 2 + frequency * 10) * 0.3 +
            Math.sin(time * 2 + frequency * 20) * 0.6 * 0.2;
        }

        const barHeight = Math.max(10, amplitude * canvas.height * 0.8);
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        // Color based on frequency and mode
        let hue: number;
        if (audioMode === 'microphone') {
          hue = (i / numBars * 120 + 120) % 360; // Green spectrum
        } else if (audioMode === 'preview') {
          hue = (i / numBars * 120 + 60) % 360; // Yellow-green spectrum
        } else {
          hue = (i / numBars * 360 + 240) % 360; // Blue-purple spectrum
        }
        
        const saturation = 70 + amplitude * 30;
        const lightness = 50 + amplitude * 40;

        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
        ctx.fillRect(x, y, barWidth - 1, barHeight);

        // Add glow effect for real audio
        if (audioMode !== 'fallback') {
          ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`;
          ctx.shadowBlur = 15;
          ctx.fillRect(x, y, barWidth - 1, barHeight);
          ctx.shadowBlur = 0;
        }
      }

      // Draw central circle that responds to audio
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      let pulseRadius: number;
      if (frequencyData && audioMode !== 'fallback') {
        // Use real audio data for pulse
        const averageAmplitude = Array.from(frequencyData).reduce((a, b) => a + b, 0) / frequencyData.length / 255;
        pulseRadius = 100 + averageAmplitude * 200;
      } else {
        // Fallback pulse
        pulseRadius = 100 + Math.sin(time * 2) * 50 * 0.7;
      }

      const circleGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
      
      if (audioMode === 'microphone') {
        circleGradient.addColorStop(0, `hsla(120, 80%, 70%, 0.6)`);
        circleGradient.addColorStop(1, `hsla(120, 80%, 70%, 0)`);
      } else if (audioMode === 'preview') {
        circleGradient.addColorStop(0, `hsla(60, 80%, 70%, 0.6)`);
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

  // Cleanup audio context
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
      case 'microphone':
        return { icon: '🎤', text: 'Live microphone analysis', color: 'text-green-400' };
      case 'preview':
        return { icon: '🎵', text: 'Preview audio analysis', color: 'text-yellow-400' };
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
      {/* Canvas Visualization */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Audio Mode Controls */}
      <div className="absolute top-4 left-4 flex gap-2">
        {micPermission === 'prompt' && (
          <button
            onClick={initMicrophoneAnalysis}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm font-medium"
          >
            🎤 Enable Microphone
          </button>
        )}
        
        {currentTrack.preview_url && audioMode !== 'preview' && (
          <button
            onClick={tryPreviewAnalysis}
            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors text-sm font-medium"
          >
            🎵 Use Preview Audio
          </button>
        )}
      </div>

      {/* Track Info Overlay */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute bottom-8 left-8 right-8 bg-black/40 backdrop-blur-lg rounded-2xl p-6 text-white"
          >
            <div className="flex items-center gap-6">
              {/* Album Art */}
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={currentTrack.album.images[0]?.url}
                  alt={currentTrack.album.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold truncate">{currentTrack.name}</h3>
                <p className="text-gray-300 truncate">
                  {currentTrack.artists.map(a => a.name).join(', ')}
                </p>
                <p className="text-sm text-gray-400">{currentTrack.album.name}</p>
              </div>

              {/* Audio Mode Info */}
              <div className="text-center">
                <div className={`text-2xl ${modeInfo.color}`}>{modeInfo.icon}</div>
                <div className={`text-xs ${modeInfo.color} font-medium`}>
                  {modeInfo.text}
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Toggle Fullscreen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
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

      {/* Status Indicator */}
      <div className="absolute top-4 right-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`} />
          {isPlaying ? 'Playing' : 'Paused'}
        </div>
      </div>
    </div>
  );
}