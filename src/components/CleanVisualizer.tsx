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

interface TrackInfo {
  energy?: number;
  valence?: number;
  tempo?: number;
  danceability?: number;
  genre?: string;
  mood?: string;
  description?: string;
}

interface CleanVisualizerProps {
  accessToken: string;
}

export default function CleanVisualizer({ accessToken }: CleanVisualizerProps) {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualMode, setVisualMode] = useState<'bars' | 'orbs' | 'waves' | 'galaxy'>('bars');
  const [player, setPlayer] = useState<any>(null);
  const [volume, setVolume] = useState(0.8);
  const [showControls, setShowControls] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

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

  // Transfer playback to our device
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

  // Get real track info from Spotify + AI
  const getTrackInfo = async (track: CurrentTrack) => {
    try {
      // Try Spotify audio features first
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

      // Enhance with AI if we don't have full info
      if (!info.genre || !info.mood) {
        const aiInfo = await getAITrackInfo(track);
        info = { ...info, ...aiInfo };
      }

      setTrackInfo(info);
    } catch (error) {
      console.error('Failed to get track info:', error);
      // Fallback to AI only
      const aiInfo = await getAITrackInfo(track);
      setTrackInfo(aiInfo);
    }
  };

  // Get track info from Gemini AI
  const getAITrackInfo = async (track: CurrentTrack): Promise<TrackInfo> => {
    try {
      const response = await fetch('/api/track-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName: track.name,
          artists: track.artists.map(a => a.name).join(', '),
          album: track.album.name
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('AI track info failed:', error);
    }

    return {};
  };

  // Playback controls
  const togglePlay = () => player?.togglePlay();
  const nextTrack = () => player?.nextTrack();
  const prevTrack = () => player?.previousTrack();
  const setPlayerVolume = (vol: number) => {
    setVolume(vol);
    player?.setVolume(vol);
  };

  // Visualization
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get audio data or generate smart fallback
      let audioData: number[];
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        audioData = Array.from(dataArrayRef.current).map(v => v / 255);
      } else {
        audioData = generateSmartAudio();
      }

      // Draw based on selected mode
      switch (visualMode) {
        case 'bars':
          drawBars(ctx, canvas, audioData);
          break;
        case 'orbs':
          drawOrbs(ctx, canvas, audioData);
          break;
        case 'waves':
          drawWaves(ctx, canvas, audioData);
          break;
        case 'galaxy':
          drawGalaxy(ctx, canvas, audioData);
          break;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTrack, visualMode]);

  // Generate smart audio data based on track info
  const generateSmartAudio = (): number[] => {
    const time = Date.now() * 0.001;
    const progress = currentTrack ? (currentTrack.progress_ms / currentTrack.duration_ms) : 0;
    
    return Array.from({ length: 64 }, (_, i) => {
      const freq = i / 64;
      const energy = trackInfo?.energy || 0.7;
      const tempo = trackInfo?.tempo || 120;
      
      const beatPhase = (time * tempo / 60) % 1;
      const beatIntensity = Math.pow(Math.sin(beatPhase * Math.PI), 2);
      
      return (
        Math.sin(time * 2 + freq * 8) * energy * 0.4 +
        Math.sin(time * 3 + freq * 12) * beatIntensity * 0.6 +
        Math.sin(time * 1.5 + freq * 6) * progress * 0.3
      ) * 0.5 + 0.3;
    });
  };

  // Visualization modes
  const drawBars = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const barWidth = canvas.width / data.length;
    data.forEach((amplitude, i) => {
      const height = amplitude * canvas.height * 0.8;
      const x = i * barWidth;
      const y = canvas.height - height;
      const hue = (i * 6 + Date.now() * 0.05) % 360;
      
      ctx.fillStyle = `hsl(${hue}, 70%, ${50 + amplitude * 30}%)`;
      ctx.fillRect(x, y, barWidth - 2, height);
    });
  };

  const drawOrbs = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    data.forEach((amplitude, i) => {
      const angle = (i / data.length) * Math.PI * 2;
      const distance = 100 + amplitude * 200;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = 5 + amplitude * 20;
      const hue = (i * 8 + Date.now() * 0.1) % 360;
      
      ctx.fillStyle = `hsl(${hue}, 80%, ${60 + amplitude * 30}%)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawWaves = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const numWaves = 5;
    for (let wave = 0; wave < numWaves; wave++) {
      const y = (canvas.height / (numWaves + 1)) * (wave + 1);
      const hue = (wave * 60 + Date.now() * 0.1) % 360;
      
      ctx.beginPath();
      ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
      ctx.lineWidth = 3;
      
      for (let x = 0; x <= canvas.width; x += 4) {
        const dataIndex = Math.floor((x / canvas.width) * (data.length - 1));
        const amplitude = data[dataIndex] || 0;
        const waveY = y + Math.sin(x * 0.02 + Date.now() * 0.003 + wave) * amplitude * 100;
        
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
  };

  const drawGalaxy = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.001;
    
    data.forEach((amplitude, i) => {
      const t = i / data.length;
      const angle = t * Math.PI * 6 + time * 0.5;
      const radius = t * 300 + amplitude * 100;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = 2 + amplitude * 8;
      const hue = (t * 240 + time * 60) % 360;
      
      ctx.fillStyle = `hsla(${hue}, 80%, ${50 + amplitude * 40}%, ${0.7 + amplitude * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
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

      {/* Clean Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top Bar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center pointer-events-auto">
              {/* Visual Mode Selector */}
              <div className="flex gap-2 bg-black/20 backdrop-blur-md rounded-full p-1">
                {[
                  { mode: 'bars', icon: '📊', label: 'Bars' },
                  { mode: 'orbs', icon: '🔮', label: 'Orbs' },
                  { mode: 'waves', icon: '🌊', label: 'Waves' },
                  { mode: 'galaxy', icon: '🌌', label: 'Galaxy' }
                ].map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setVisualMode(mode as any)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      visualMode === mode
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    title={label}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              {/* Hide Controls Button */}
              <button
                onClick={() => setShowControls(false)}
                className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bottom Player */}
            <div className="absolute bottom-6 left-6 right-6 pointer-events-auto">
              <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                {/* Track Info */}
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={currentTrack.album.images[0]?.url}
                    alt={currentTrack.album.name}
                    className="w-16 h-16 rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{currentTrack.name}</h3>
                    <p className="text-gray-300 truncate">{currentTrack.artists.map(a => a.name).join(', ')}</p>
                    {trackInfo?.description && (
                      <p className="text-xs text-gray-400 mt-1">{trackInfo.description}</p>
                    )}
                  </div>
                  
                  {/* Real Track Stats */}
                  {trackInfo && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {trackInfo.energy && (
                        <div className="text-center">
                          <div className="text-orange-400 font-bold">{Math.round(trackInfo.energy * 100)}%</div>
                          <div className="text-gray-400">Energy</div>
                        </div>
                      )}
                      {trackInfo.valence && (
                        <div className="text-center">
                          <div className="text-green-400 font-bold">{Math.round(trackInfo.valence * 100)}%</div>
                          <div className="text-gray-400">Mood</div>
                        </div>
                      )}
                      {trackInfo.tempo && (
                        <div className="text-center">
                          <div className="text-blue-400 font-bold">{Math.round(trackInfo.tempo)}</div>
                          <div className="text-gray-400">BPM</div>
                        </div>
                      )}
                      {trackInfo.genre && (
                        <div className="text-center">
                          <div className="text-purple-400 font-bold text-xs">{trackInfo.genre}</div>
                          <div className="text-gray-400">Genre</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  {/* Progress Bar */}
                  <div className="flex-1 mr-6">
                    <div className="w-full bg-white/10 rounded-full h-1">
                      <div
                        className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-full h-1 transition-all duration-1000"
                        style={{ width: `${(currentTrack.progress_ms / currentTrack.duration_ms) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-3">
                    <button onClick={prevTrack} className="p-2 text-white/70 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                      </svg>
                    </button>
                    
                    <button onClick={togglePlay} className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                    
                    <button onClick={nextTrack} className="p-2 text-white/70 hover:text-white transition-colors">
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show Controls Button (when hidden) */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="absolute top-6 right-6 p-3 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </button>
      )}
    </div>
  );
}