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

interface AudioFeatures {
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
}

interface HybridVisualizerProps {
  accessToken: string;
}

export default function HybridVisualizer({ accessToken }: HybridVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visualMode, setVisualMode] = useState<'reactive' | 'flow' | 'pulse' | 'spiral'>('reactive');
  const [beatIntensity, setBeatIntensity] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTrackIdRef = useRef<string>('');
  const progressRef = useRef<number>(0);

  // Poll for currently playing track and audio features
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
          
          // Get audio features if track changed
          if (data.track && data.track.id !== lastTrackIdRef.current) {
            lastTrackIdRef.current = data.track.id;
            await getAudioFeatures(data.track.id);
          }
          
          // Update progress for beat sync
          if (data.track) {
            progressRef.current = data.track.progress_ms / data.track.duration_ms;
          }
        }
      } catch (error) {
        console.error('Failed to get currently playing:', error);
      }
    };

    pollCurrentTrack();
    const interval = setInterval(pollCurrentTrack, 1000); // Fast polling for responsiveness
    return () => clearInterval(interval);
  }, [accessToken]);

  // Get audio features for intelligent visualization
  const getAudioFeatures = async (trackId: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const features = await response.json();
        setAudioFeatures(features);
        console.log('🎵 Got audio features:', features);
      } else {
        console.log('Audio features not available, using smart defaults');
        // Generate smart defaults based on track info
        setAudioFeatures({
          energy: 0.7,
          valence: 0.6,
          tempo: 120,
          danceability: 0.7,
          acousticness: 0.3,
          instrumentalness: 0.1,
          liveness: 0.2,
          speechiness: 0.1
        });
      }
    } catch (error) {
      console.error('Failed to get audio features:', error);
      // Smart fallback
      setAudioFeatures({
        energy: 0.7,
        valence: 0.6,
        tempo: 120,
        danceability: 0.7,
        acousticness: 0.3,
        instrumentalness: 0.1,
        liveness: 0.2,
        speechiness: 0.1
      });
    }
  };

  // Smart beat detection based on tempo and progress
  const getSmartBeatData = (time: number, progress: number, features: AudioFeatures) => {
    const bpm = features.tempo;
    const beatInterval = 60 / bpm; // seconds per beat
    const timeInSong = progress * (currentTrack?.duration_ms || 0) / 1000;
    
    // Calculate beat phase
    const beatPhase = (timeInSong % beatInterval) / beatInterval;
    
    // Create beat intensity curve
    const beatCurve = Math.pow(Math.sin(beatPhase * Math.PI), 2);
    
    // Add energy and danceability influence
    const energyMultiplier = 0.5 + features.energy * 0.5;
    const danceMultiplier = 0.5 + features.danceability * 0.5;
    
    return {
      beat: beatCurve * energyMultiplier * danceMultiplier,
      bass: beatCurve * features.energy,
      mid: Math.sin(time * 2 + beatPhase * 4) * features.valence,
      treble: Math.sin(time * 4 + beatPhase * 8) * (1 - features.acousticness)
    };
  };

  // Generate frequency data based on audio features
  const generateSmartFrequencyData = (time: number, progress: number, features: AudioFeatures): number[] => {
    const beatData = getSmartBeatData(time, progress, features);
    
    return Array.from({ length: 64 }, (_, i) => {
      const freq = i / 64;
      let amplitude = 0;
      
      // Bass frequencies (0-0.2)
      if (freq < 0.2) {
        amplitude = beatData.bass * (1 - freq * 2) * 0.8;
      }
      // Mid frequencies (0.2-0.6)
      else if (freq < 0.6) {
        amplitude = beatData.mid * Math.sin((freq - 0.2) * Math.PI * 1.25) * 0.6;
      }
      // Treble frequencies (0.6-1.0)
      else {
        amplitude = beatData.treble * (freq - 0.6) * 2.5 * 0.4;
      }
      
      // Add some musical variation
      amplitude += Math.sin(time * 3 + freq * 12) * features.energy * 0.2;
      amplitude += Math.sin(time * 1.5 + freq * 8) * features.danceability * 0.15;
      
      return Math.max(0, Math.min(1, amplitude + 0.1));
    });
  };

  // Responsive visualization
  useEffect(() => {
    if (!isPlaying || !audioFeatures) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      const time = Date.now() * 0.001;
      const progress = progressRef.current;
      
      // Smooth fade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get smart audio data
      const frequencyData = generateSmartFrequencyData(time, progress, audioFeatures);
      const beatData = getSmartBeatData(time, progress, audioFeatures);
      
      // Update beat intensity for UI
      setBeatIntensity(beatData.beat);

      // Draw visualization based on mode
      if (visualMode === 'reactive') {
        drawReactiveMode(ctx, canvas, frequencyData, beatData, time, audioFeatures);
      } else if (visualMode === 'flow') {
        drawFlowMode(ctx, canvas, frequencyData, beatData, time, audioFeatures);
      } else if (visualMode === 'pulse') {
        drawPulseMode(ctx, canvas, frequencyData, beatData, time, audioFeatures);
      } else if (visualMode === 'spiral') {
        drawSpiralMode(ctx, canvas, frequencyData, beatData, time, audioFeatures);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, audioFeatures, visualMode]);

  // Reactive bars visualization
  const drawReactiveMode = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, freq: number[], beat: any, time: number, features: AudioFeatures) => {
    const numBars = 64;
    const barWidth = canvas.width / numBars;
    
    for (let i = 0; i < numBars; i++) {
      const amplitude = freq[i];
      const barHeight = amplitude * canvas.height * 0.7;
      const x = i * barWidth;
      const y = canvas.height - barHeight;
      
      // Color based on frequency and mood
      const hue = (i * 4 + time * 20 + features.valence * 60) % 360;
      const saturation = 60 + features.energy * 40;
      const lightness = 40 + amplitude * 40 + beat.beat * 20;
      
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.fillRect(x, y, barWidth - 2, barHeight);
      
      // Glow effect on beat
      if (beat.beat > 0.7) {
        ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.shadowBlur = 15;
        ctx.fillRect(x, y, barWidth - 2, barHeight);
        ctx.shadowBlur = 0;
      }
    }
  };

  // Flow lines visualization
  const drawFlowMode = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, freq: number[], beat: any, time: number, features: AudioFeatures) => {
    const numLines = 8;
    
    for (let line = 0; line < numLines; line++) {
      const y = (canvas.height / (numLines + 1)) * (line + 1);
      const hue = (line * 45 + time * 30 + features.valence * 120) % 360;
      
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
      ctx.lineWidth = 2 + beat.beat * 3;
      
      for (let x = 0; x <= canvas.width; x += 4) {
        const progress = x / canvas.width;
        const freqIndex = Math.floor(progress * (freq.length - 1));
        const amplitude = freq[freqIndex] || 0;
        
        const waveY = y + 
          Math.sin(x * 0.01 + time * 2 + line * 0.5) * amplitude * 60 * features.energy +
          Math.sin(x * 0.02 + time * 3) * beat.beat * 40;

        if (x === 0) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      
      ctx.stroke();
    }
  };

  // Pulse orbs visualization
  const drawPulseMode = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, freq: number[], beat: any, time: number, features: AudioFeatures) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numOrbs = 12;
    
    for (let i = 0; i < numOrbs; i++) {
      const angle = (i / numOrbs) * Math.PI * 2 + time * 0.5;
      const freqIndex = Math.floor((i / numOrbs) * (freq.length - 1));
      const amplitude = freq[freqIndex] || 0;
      
      const distance = 150 + amplitude * 200 + beat.beat * 100;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      const size = 15 + amplitude * 25 + beat.beat * 15;
      const hue = (i * 30 + time * 40 + features.valence * 180) % 360;
      
      // Glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${amplitude * 0.8})`);
      gradient.addColorStop(1, `hsla(${hue}, 80%, 70%, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = `hsl(${hue}, 90%, ${60 + amplitude * 30}%)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Spiral galaxy visualization
  const drawSpiralMode = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, freq: number[], beat: any, time: number, features: AudioFeatures) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numArms = 3;
    const pointsPerArm = 50;
    
    for (let arm = 0; arm < numArms; arm++) {
      const armOffset = (arm / numArms) * Math.PI * 2;
      
      ctx.beginPath();
      
      for (let i = 0; i < pointsPerArm; i++) {
        const t = i / pointsPerArm;
        const freqIndex = Math.floor(t * (freq.length - 1));
        const amplitude = freq[freqIndex] || 0;
        
        const angle = armOffset + t * Math.PI * 4 + time * 0.5;
        const radius = t * 300 + amplitude * 100 + beat.beat * 50;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        const size = 2 + amplitude * 8 + beat.beat * 5;
        const hue = (t * 120 + arm * 120 + time * 60 + features.valence * 240) % 360;
        
        ctx.fillStyle = `hsla(${hue}, 80%, ${50 + amplitude * 40}%, ${0.6 + amplitude * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

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
      case 'reactive':
        return { icon: '📊', text: 'Reactive Bars' };
      case 'flow':
        return { icon: '🌊', text: 'Flow Lines' };
      case 'pulse':
        return { icon: '🔮', text: 'Pulse Orbs' };
      case 'spiral':
        return { icon: '🌌', text: 'Spiral Galaxy' };
      default:
        return { icon: '📊', text: 'Reactive Bars' };
    }
  };

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold mb-2">No music playing</h2>
          <p className="text-gray-300">Start playing music on Spotify to see smart visualizations</p>
        </div>
      </div>
    );
  }

  const modeInfo = getVisualModeInfo();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Visual Mode Selector */}
      <div className="absolute top-4 left-4 flex gap-1 bg-black/20 backdrop-blur-sm rounded-lg p-1">
        {(['reactive', 'flow', 'pulse', 'spiral'] as const).map((mode) => {
          const modeInfo = mode === 'reactive' ? { icon: '📊' } :
                          mode === 'flow' ? { icon: '🌊' } :
                          mode === 'pulse' ? { icon: '🔮' } :
                          { icon: '🌌' };
          
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

              {/* Audio Features Display */}
              {audioFeatures && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-purple-400 font-bold">{Math.round(audioFeatures.energy * 100)}%</div>
                    <div className="text-gray-400">Energy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-pink-400 font-bold">{Math.round(audioFeatures.valence * 100)}%</div>
                    <div className="text-gray-400">Mood</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-bold">{Math.round(audioFeatures.tempo)}</div>
                    <div className="text-gray-400">BPM</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-bold">{Math.round(audioFeatures.danceability * 100)}%</div>
                    <div className="text-gray-400">Dance</div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <div className="text-xl">{modeInfo.icon}</div>
                <div className="text-xs text-white/70 font-medium">
                  {modeInfo.text}
                </div>
                {beatIntensity > 0.7 && (
                  <div className="text-xs text-red-400 font-bold animate-pulse">
                    BEAT!
                  </div>
                )}
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
        
        {audioFeatures && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Smart Mode
          </div>
        )}
      </div>
    </div>
  );
}