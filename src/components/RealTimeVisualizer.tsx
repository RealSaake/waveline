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

interface RealTimeVisualizerProps {
  accessToken: string;
}

export default function RealTimeVisualizer({ accessToken }: RealTimeVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Poll for currently playing track
  useEffect(() => {
    const pollCurrentTrack = async () => {
      try {
        console.log('Polling with token:', accessToken ? 'Token exists' : 'No token');
        const response = await fetch('/api/currently-playing', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        console.log('API Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('API Response data:', data);
          setCurrentTrack(data.track);
          setAudioFeatures(data.audioFeatures);
          setIsPlaying(data.isPlaying);
        } else {
          const errorData = await response.text();
          console.error('API Error:', response.status, errorData);
        }
      } catch (error) {
        console.error('Failed to get currently playing:', error);
      }
    };

    pollCurrentTrack();
    const interval = setInterval(pollCurrentTrack, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [accessToken]);

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

      // Use audio features if available, otherwise use defaults
      const features = audioFeatures || {
        energy: 0.7,
        valence: 0.5,
        tempo: 120,
        danceability: 0.6,
        acousticness: 0.3,
        instrumentalness: 0.1,
        liveness: 0.2,
        speechiness: 0.1
      };

      // Create gradient background based on valence
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );

      if (features.valence > 0.7) {
        gradient.addColorStop(0, `hsla(60, 80%, 60%, 0.3)`); // Happy - yellow
        gradient.addColorStop(1, `hsla(120, 60%, 40%, 0.1)`); // Green
      } else if (features.valence > 0.4) {
        gradient.addColorStop(0, `hsla(240, 80%, 60%, 0.3)`); // Neutral - blue
        gradient.addColorStop(1, `hsla(280, 60%, 40%, 0.1)`); // Purple
      } else {
        gradient.addColorStop(0, `hsla(0, 80%, 60%, 0.3)`); // Sad - red
        gradient.addColorStop(1, `hsla(20, 60%, 40%, 0.1)`); // Orange
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars
      const numBars = 128;
      const barWidth = canvas.width / numBars;
      const time = Date.now() * 0.001;

      for (let i = 0; i < numBars; i++) {
        const frequency = i / numBars;
        const amplitude = features.energy * 0.8 +
          Math.sin(time * features.tempo / 60 + frequency * 10) * 0.3 +
          Math.sin(time * 2 + frequency * 20) * features.danceability * 0.2;

        const barHeight = Math.max(10, amplitude * canvas.height * 0.6);
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        // Color based on frequency and valence
        const hue = (frequency * 360 + features.valence * 60) % 360;
        const saturation = 70 + features.energy * 30;
        const lightness = 50 + features.danceability * 30;

        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
        ctx.fillRect(x, y, barWidth - 1, barHeight);

        // Add glow effect
        ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
        ctx.shadowBlur = 20;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
        ctx.shadowBlur = 0;
      }

      // Draw central circle that pulses with tempo
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const pulseRadius = 100 + Math.sin(time * features.tempo / 30) * 50 * features.energy;

      const circleGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
      circleGradient.addColorStop(0, `hsla(${features.valence * 120}, 80%, 70%, 0.6)`);
      circleGradient.addColorStop(1, `hsla(${features.valence * 120}, 80%, 70%, 0)`);

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
  }, [audioFeatures, isPlaying, currentTrack]);

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
          <p className="text-gray-300">Start playing music on Spotify to see visualizations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Canvas Visualization */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

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

              {/* Audio Features */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {audioFeatures ? (
                  <>
                    <div>
                      <div className="text-gray-400">Energy</div>
                      <div className="font-bold">{Math.round(audioFeatures.energy * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Mood</div>
                      <div className="font-bold">{Math.round(audioFeatures.valence * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Tempo</div>
                      <div className="font-bold">{Math.round(audioFeatures.tempo)} BPM</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Dance</div>
                      <div className="font-bold">{Math.round(audioFeatures.danceability * 100)}%</div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-center">
                    <div className="text-yellow-400 text-xs">
                      🎵 Using default visualization
                    </div>
                  </div>
                )}
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