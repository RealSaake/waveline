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

interface TrackInfo {
  energy?: number;
  valence?: number;
  tempo?: number;
  danceability?: number;
  genre?: string;
  mood?: string;
  description?: string;
}

interface MainVisualizerProps {
  accessToken: string;
}

export default function MainVisualizer({ accessToken }: MainVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualMode, setVisualMode] = useState<'particles' | 'waves' | 'spiral' | 'pulse' | 'bars'>('particles');
  const [player, setPlayer] = useState<any>(null);
  const [volume, setVolume] = useState(0.8);
  const [showSettings, setShowSettings] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Initialize Spotify SDK
  useEffect(() => {
    const initSDK = async () => {
      if ((window as any).Spotify) {
        setupPlayer();
        return;
      }

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
        name: 'Waveline',
        getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
        volume: 1.0
      });

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        setPlayer(spotifyPlayer);
        transferPlayback(device_id);
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        
        if (state.track_window.current_track) {
          getTrackInfo(state.track_window.current_track);
        }
      });

      spotifyPlayer.connect();
    };

    initSDK();
  }, [accessToken]);

  // Transfer playback
  const transferPlayback = async (deviceId: string) => {
    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
      });
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  // Get track info
  const getTrackInfo = async (track: CurrentTrack) => {
    try {
      // Try Spotify first
      const spotifyResponse = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      let info: TrackInfo = {};

      if (spotifyResponse.ok) {
        const features = await spotifyResponse.json();
        info = {
          energy: features.energy,
          valence: features.valence,
          tempo: features.tempo,
          danceability: features.danceability,
        };
      }

      // Enhance with AI
      const aiResponse = await fetch('/api/track-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName: track.name,
          artists: track.artists.map(a => a.name).join(', '),
          album: track.album.name
        }),
      });

      if (aiResponse.ok) {
        const aiInfo = await aiResponse.json();
        info = { ...info, ...aiInfo };
      }

      setTrackInfo(info);
    } catch (error) {
      console.error('Failed to get track info:', error);
    }
  };

  // Playback controls
  const togglePlay = () => player?.togglePlay();
  const nextTrack = () => player?.nextTrack();
  const prevTrack = () => player?.previousTrack();
  const setPlayerVolume = (vol: number) => {
    setVolume(vol);
    player?.setVolume(vol);
  };

  // Always animate (not just when playing)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      // Clear with slight fade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Generate audio data
      const audioData = generateAudioData();

      // Draw visualization
      switch (visualMode) {
        case 'particles':
          drawParticles(ctx, canvas, audioData);
          break;
        case 'waves':
          drawWaves(ctx, canvas, audioData);
          break;
        case 'spiral':
          drawSpiral(ctx, canvas, audioData);
          break;
        case 'pulse':
          drawPulse(ctx, canvas, audioData);
          break;
        case 'bars':
          drawBars(ctx, canvas, audioData);
          break;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visualMode, trackInfo, isPlaying]);

  // Generate audio data
  const generateAudioData = (): number[] => {
    const time = Date.now() * 0.001;
    const progress = Math.max(0, Math.min(1, currentTrack ? (currentTrack.progress_ms / currentTrack.duration_ms) : 0));
    const energy = Math.max(0, Math.min(1, trackInfo?.energy || 0.7));
    const tempo = Math.max(60, Math.min(200, trackInfo?.tempo || 120));
    
    const beatPhase = (time * tempo / 60) % 1;
    const beatIntensity = Math.pow(Math.sin(beatPhase * Math.PI), 2);
    const playingMultiplier = isPlaying ? 1 : 0.3; // Dim when paused
    
    return Array.from({ length: 64 }, (_, i) => {
      const freq = i / 64;
      
      const value = (
        Math.sin(time * 2 + freq * 8) * energy * 0.4 +
        Math.sin(time * 3 + freq * 12) * beatIntensity * 0.6 +
        Math.sin(time * 1.5 + freq * 6) * progress * 0.3 +
        Math.random() * 0.1
      ) * 0.5 * playingMultiplier + 0.2;
      
      // Ensure the value is always finite and within bounds
      return Math.max(0, Math.min(1, isFinite(value) ? value : 0.5));
    });
  };

  // Visualization functions
  const drawParticles = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.001;
    
    data.forEach((amplitude, i) => {
      // Ensure all values are safe
      const safeAmplitude = Math.max(0, Math.min(1, amplitude || 0));
      const angle = (i / data.length) * Math.PI * 2 + time * 0.5;
      const distance = 100 + safeAmplitude * 300;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = Math.max(1, Math.min(50, 3 + safeAmplitude * 15));
      const hue = (i * 6 + time * 50) % 360;
      
      // Check if coordinates are valid
      if (!isFinite(x) || !isFinite(y) || !isFinite(size)) return;
      
      // Glow effect with safe radius
      const glowRadius = Math.max(1, size * 2);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${safeAmplitude})`);
      gradient.addColorStop(1, `hsla(${hue}, 80%, 70%, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = `hsl(${hue}, 90%, 80%)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawWaves = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const numWaves = 6;
    const time = Date.now() * 0.001;
    
    for (let wave = 0; wave < numWaves; wave++) {
      const y = (canvas.height / (numWaves + 1)) * (wave + 1);
      const hue = (wave * 60 + time * 30) % 360;
      
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
      ctx.lineWidth = Math.max(1, 3 + wave);
      
      for (let x = 0; x <= canvas.width; x += 3) {
        const dataIndex = Math.floor((x / canvas.width) * (data.length - 1));
        const amplitude = Math.max(0, Math.min(1, data[dataIndex] || 0));
        const waveY = y + 
          Math.sin(x * 0.01 + time * 2 + wave * 0.5) * amplitude * 80 +
          Math.sin(x * 0.02 + time * 3) * amplitude * 40;
        
        // Ensure waveY is finite
        const safeWaveY = isFinite(waveY) ? waveY : y;
        
        if (x === 0) ctx.moveTo(x, safeWaveY);
        else ctx.lineTo(x, safeWaveY);
      }
      ctx.stroke();
    }
  };

  const drawSpiral = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.001;
    
    data.forEach((amplitude, i) => {
      const safeAmplitude = Math.max(0, Math.min(1, amplitude || 0));
      const t = i / data.length;
      const angle = t * Math.PI * 8 + time;
      const radius = t * 400 + safeAmplitude * 100;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = Math.max(1, Math.min(20, 2 + safeAmplitude * 12));
      const hue = (t * 300 + time * 60) % 360;
      const lightness = Math.max(10, Math.min(90, 50 + safeAmplitude * 40));
      const alpha = Math.max(0.1, Math.min(1, 0.7 + safeAmplitude * 0.3));
      
      // Check if coordinates are valid
      if (!isFinite(x) || !isFinite(y) || !isFinite(size)) return;
      
      ctx.fillStyle = `hsla(${hue}, 80%, ${lightness}%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawPulse = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.001;
    const avgAmplitude = Math.max(0, Math.min(1, data.reduce((a, b) => a + b, 0) / data.length || 0));
    
    // Main pulse
    const radius = Math.max(20, Math.min(400, 100 + avgAmplitude * 200));
    const hue = (time * 50) % 360;
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${avgAmplitude})`);
    gradient.addColorStop(0.7, `hsla(${hue + 60}, 80%, 60%, ${avgAmplitude * 0.5})`);
    gradient.addColorStop(1, `hsla(${hue + 120}, 80%, 50%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Ring effects
    for (let ring = 1; ring <= 3; ring++) {
      const ringRadius = Math.max(1, radius + ring * 50);
      const alpha = Math.max(0, Math.min(1, avgAmplitude * 0.3));
      ctx.strokeStyle = `hsla(${hue + ring * 40}, 70%, 60%, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const drawBars = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const barWidth = Math.max(1, canvas.width / data.length);
    const time = Date.now() * 0.001;
    
    data.forEach((amplitude, i) => {
      const safeAmplitude = Math.max(0, Math.min(1, amplitude || 0));
      const height = Math.max(1, safeAmplitude * canvas.height * 0.8);
      const x = i * barWidth;
      const y = Math.max(0, canvas.height - height);
      const hue = (i * 6 + time * 30) % 360;
      const lightness = Math.max(20, Math.min(80, 50 + safeAmplitude * 30));
      
      // Glow
      ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
      ctx.shadowBlur = Math.max(0, 15);
      
      ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
      ctx.fillRect(x, y, Math.max(1, barWidth - 2), height);
      
      ctx.shadowBlur = 0;
    });
  };

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold mb-2">Connect to Spotify</h2>
          <p className="text-gray-300">Start playing music to see visualizations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Simple Controls */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        {/* Visual Modes */}
        <div className="flex gap-2 bg-black/30 backdrop-blur-md rounded-full p-1">
          {[
            { mode: 'particles', icon: '✨', label: 'Particles' },
            { mode: 'waves', icon: '🌊', label: 'Waves' },
            { mode: 'spiral', icon: '🌀', label: 'Spiral' },
            { mode: 'pulse', icon: '💫', label: 'Pulse' },
            { mode: 'bars', icon: '📊', label: 'Bars' }
          ].map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setVisualMode(mode as any)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                visualMode === mode
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Player */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-4">
            <img
              src={currentTrack.album.images[0]?.url}
              alt={currentTrack.album.name}
              className="w-12 h-12 rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate">{currentTrack.name}</h3>
              <p className="text-gray-300 text-sm truncate">{currentTrack.artists.map(a => a.name).join(', ')}</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              <button onClick={prevTrack} className="text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              
              <button onClick={togglePlay} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              
              <button onClick={nextTrack} className="text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 ml-4">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setPlayerVolume(parseFloat(e.target.value))}
                  className="w-20 slider"
                />
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="w-full bg-white/10 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-full h-1 transition-all duration-1000"
                style={{ width: `${(currentTrack.progress_ms / currentTrack.duration_ms) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && trackInfo && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-6 bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10 w-64"
          >
            <h3 className="text-white font-semibold mb-3">Track Info</h3>
            <div className="space-y-2 text-sm">
              {trackInfo.energy && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Energy</span>
                  <span className="text-orange-400">{Math.round(trackInfo.energy * 100)}%</span>
                </div>
              )}
              {trackInfo.valence && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Mood</span>
                  <span className="text-green-400">{Math.round(trackInfo.valence * 100)}%</span>
                </div>
              )}
              {trackInfo.tempo && (
                <div className="flex justify-between">
                  <span className="text-gray-300">BPM</span>
                  <span className="text-blue-400">{Math.round(trackInfo.tempo)}</span>
                </div>
              )}
              {trackInfo.genre && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Genre</span>
                  <span className="text-purple-400">{trackInfo.genre}</span>
                </div>
              )}
              {trackInfo.description && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-gray-300 text-xs">{trackInfo.description}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}