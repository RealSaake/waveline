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

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  brightness: number;
}

interface ParticleVisualizerProps {
  accessToken: string;
}

export default function ParticleVisualizer({ accessToken }: ParticleVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioMode, setAudioMode] = useState<'system' | 'preview' | 'fallback'>('fallback');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [visualMode, setVisualMode] = useState<'particles' | 'waves' | 'galaxy' | 'neural'>('particles');
  const [beatDetected, setBeatDetected] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | AudioBufferSourceNode | null>(null);
  
  // Particle system
  const particlesRef = useRef<Particle[]>([]);
  const lastBeatRef = useRef<number>(0);
  const beatThresholdRef = useRef<number>(0);

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
      
      analyser.fftSize = 2048; // Even higher resolution
      analyser.smoothingTimeConstant = 0.6; // Less smoothing for more responsive
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;
      
      setAudioMode('system');
      setAudioEnabled(true);
      console.log('🔊 System audio capture enabled with advanced analysis');

      stream.getAudioTracks()[0].onended = () => {
        setAudioMode('fallback');
        setAudioEnabled(false);
      };

    } catch (error) {
      console.error('System audio capture failed:', error);
      alert('System audio capture failed. Make sure to:\n1. Select "Share audio" when prompted\n2. Choose the browser tab playing Spotify\n3. Allow audio sharing');
    }
  };

  // Initialize particles
  const initParticles = (count: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle());
    }
    particlesRef.current = particles;
  };

  const createParticle = (): Particle => {
    const canvas = canvasRef.current;
    if (!canvas) return {} as Particle;

    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      vz: (Math.random() - 0.5) * 5,
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 200,
      size: Math.random() * 3 + 1,
      hue: Math.random() * 360,
      brightness: Math.random() * 0.5 + 0.5
    };
  };

  // Beat detection
  const detectBeat = (frequencyData: Uint8Array): boolean => {
    const bassRange = Math.floor(frequencyData.length * 0.1);
    const bassSum = Array.from(frequencyData.slice(0, bassRange)).reduce((a, b) => a + b, 0);
    const bassAverage = bassSum / bassRange;
    
    // Adaptive threshold
    beatThresholdRef.current = beatThresholdRef.current * 0.95 + bassAverage * 0.05;
    
    const now = Date.now();
    const timeSinceLastBeat = now - lastBeatRef.current;
    
    if (bassAverage > beatThresholdRef.current * 1.3 && timeSinceLastBeat > 200) {
      lastBeatRef.current = now;
      return true;
    }
    
    return false;
  };

  // Advanced visualization
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize particles
    initParticles(visualMode === 'galaxy' ? 2000 : 1000);

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Trailing effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let frequencyData: Uint8Array | null = null;
      let bassLevel = 0;
      let midLevel = 0;
      let trebleLevel = 0;
      
      if (analyserRef.current && dataArrayRef.current && audioMode !== 'fallback') {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        frequencyData = dataArrayRef.current;
        
        // Frequency analysis
        const third = Math.floor(frequencyData.length / 3);
        bassLevel = Array.from(frequencyData.slice(0, third)).reduce((a, b) => a + b, 0) / third / 255;
        midLevel = Array.from(frequencyData.slice(third, third * 2)).reduce((a, b) => a + b, 0) / third / 255;
        trebleLevel = Array.from(frequencyData.slice(third * 2)).reduce((a, b) => a + b, 0) / third / 255;
        
        // Beat detection
        const beat = detectBeat(frequencyData);
        if (beat) {
          setBeatDetected(true);
          setTimeout(() => setBeatDetected(false), 100);
          
          // Add burst of particles on beat
          for (let i = 0; i < 50; i++) {
            particlesRef.current.push(createParticle());
          }
        }
      } else {
        // Fallback values
        const time = Date.now() * 0.001;
        bassLevel = (Math.sin(time * 2) + 1) * 0.3;
        midLevel = (Math.sin(time * 3) + 1) * 0.3;
        trebleLevel = (Math.sin(time * 4) + 1) * 0.3;
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        // Update particle
        particle.life++;
        
        if (visualMode === 'particles') {
          particle.vx += (Math.random() - 0.5) * 0.1;
          particle.vy += (Math.random() - 0.5) * 0.1;
          particle.x += particle.vx + bassLevel * 5;
          particle.y += particle.vy + midLevel * 5;
        } else if (visualMode === 'waves') {
          const time = Date.now() * 0.001;
          particle.x += Math.sin(time + particle.y * 0.01) * bassLevel * 10;
          particle.y += particle.vy;
          particle.vy += bassLevel * 0.5;
        } else if (visualMode === 'galaxy') {
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const angle = Math.atan2(particle.y - centerY, particle.x - centerX);
          const distance = Math.sqrt((particle.x - centerX) ** 2 + (particle.y - centerY) ** 2);
          
          particle.x = centerX + Math.cos(angle + bassLevel * 0.1) * distance;
          particle.y = centerY + Math.sin(angle + bassLevel * 0.1) * distance;
        } else if (visualMode === 'neural') {
          // Neural network-like connections
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vx *= 0.99;
          particle.vy *= 0.99;
        }

        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        const alpha = 1 - (particle.life / particle.maxLife);
        const size = particle.size * (1 + bassLevel * 2);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        if (visualMode === 'neural') {
          // Draw connections between nearby particles
          particlesRef.current.forEach(other => {
            const dx = particle.x - other.x;
            const dy = particle.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100 && distance > 0) {
              ctx.strokeStyle = `hsla(${particle.hue}, 70%, 60%, ${0.1 * alpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.stroke();
            }
          });
        }

        // Particle glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size * 3
        );
        
        const hue = (particle.hue + trebleLevel * 60) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${hue}, 80%, 70%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Core particle
        ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        return particle.life < particle.maxLife;
      });

      // Add new particles continuously
      if (particlesRef.current.length < (visualMode === 'galaxy' ? 2000 : 1000)) {
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push(createParticle());
        }
      }

      // Beat flash effect
      if (beatDetected) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = `hsla(${Math.random() * 360}, 80%, 70%, 0.1)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTrack, audioMode, visualMode, beatDetected]);

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
      case 'particles':
        return { icon: '✨', text: 'Particle Storm' };
      case 'waves':
        return { icon: '🌊', text: 'Wave Motion' };
      case 'galaxy':
        return { icon: '🌌', text: 'Galaxy Spiral' };
      case 'neural':
        return { icon: '🧠', text: 'Neural Network' };
      default:
        return { icon: '✨', text: 'Particle Storm' };
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
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm font-medium"
          >
            🔊 Enable Audio Analysis
          </button>
        )}
        
        {/* Visual Mode Selector */}
        <div className="flex gap-1">
          {(['particles', 'waves', 'galaxy', 'neural'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setVisualMode(mode)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                visualMode === mode
                  ? 'bg-white/20 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
              {getVisualModeInfo().icon}
            </button>
          ))}
        </div>
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
                <div className="text-2xl">{modeInfo.icon}</div>
                <div className="text-xs text-white/70 font-medium">
                  {modeInfo.text}
                </div>
                {beatDetected && (
                  <div className="text-xs text-red-400 font-bold animate-pulse">
                    BEAT!
                  </div>
                )}
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
      <div className="absolute top-4 right-4 flex gap-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`} />
          {isPlaying ? 'Playing' : 'Paused'}
        </div>
        
        {audioEnabled && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Audio Active
          </div>
        )}
      </div>
    </div>
  );
}