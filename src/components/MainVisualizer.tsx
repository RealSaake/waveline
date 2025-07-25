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
  const [visualMode, setVisualMode] = useState<'kaleidoscope' | 'neural' | 'plasma' | 'fractal' | 'liquid'>('kaleidoscope');
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
        case 'kaleidoscope':
          drawKaleidoscope(ctx, canvas, audioData);
          break;
        case 'neural':
          drawNeural(ctx, canvas, audioData);
          break;
        case 'plasma':
          drawPlasma(ctx, canvas, audioData);
          break;
        case 'fractal':
          drawFractal(ctx, canvas, audioData);
          break;
        case 'liquid':
          drawLiquid(ctx, canvas, audioData);
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

  // Generate reactive audio data
  const generateAudioData = (): number[] => {
    const time = Date.now() * 0.001;
    const progress = Math.max(0, Math.min(1, currentTrack ? (currentTrack.progress_ms / currentTrack.duration_ms) : 0));
    const energy = Math.max(0, Math.min(1, trackInfo?.energy || 0.7));
    const tempo = Math.max(60, Math.min(200, trackInfo?.tempo || 120));
    const danceability = Math.max(0, Math.min(1, trackInfo?.danceability || 0.7));
    
    // More reactive beat detection
    const beatPhase = (time * tempo / 60) % 1;
    const beatIntensity = Math.pow(Math.sin(beatPhase * Math.PI), 3) * energy;
    const subBeat = Math.sin(time * tempo / 15) * 0.3;
    
    // Playing state affects intensity dramatically
    const playingMultiplier = isPlaying ? (1 + beatIntensity * 0.5) : 0.1;
    
    return Array.from({ length: 128 }, (_, i) => {
      const freq = i / 128;
      
      // Create frequency-specific responses
      let value = 0;
      
      // Bass (low frequencies)
      if (freq < 0.3) {
        value = Math.sin(time * 2 + freq * 6) * energy * 0.8 + beatIntensity * 0.9;
      }
      // Mids
      else if (freq < 0.7) {
        value = Math.sin(time * 3 + freq * 10) * danceability * 0.6 + subBeat;
      }
      // Highs
      else {
        value = Math.sin(time * 4 + freq * 15) * energy * 0.4 + Math.random() * 0.2;
      }
      
      // Add progress-based modulation
      value += Math.sin(time * 1.5 + freq * 8) * progress * 0.4;
      
      // Add beat synchronization
      value *= (0.7 + beatIntensity * 0.6) * playingMultiplier;
      
      // Ensure valid range
      return Math.max(0, Math.min(1, isFinite(value) ? Math.abs(value) : 0.3));
    });
  };

  // Cool visualization functions
  const drawKaleidoscope = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.001;
    
    // Create kaleidoscope effect with multiple symmetrical patterns
    for (let segment = 0; segment < 8; segment++) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((segment * Math.PI * 2) / 8);
      
      data.forEach((amplitude, i) => {
        const safeAmplitude = Math.max(0, Math.min(1, amplitude || 0));
        const angle = (i / data.length) * Math.PI + time * 0.5;
        const radius = 50 + safeAmplitude * 200;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.5; // Flatten for kaleidoscope effect
        
        if (!isFinite(x) || !isFinite(y)) return;
        
        const size = Math.max(2, safeAmplitude * 20);
        const hue = (i * 8 + time * 100 + segment * 45) % 360;
        
        // Create mirrored effect
        [-1, 1].forEach(mirror => {
          const finalX = x * mirror;
          const finalY = y;
          
          const gradient = ctx.createRadialGradient(finalX, finalY, 0, finalX, finalY, size * 2);
          gradient.addColorStop(0, `hsla(${hue}, 90%, 70%, ${safeAmplitude * 0.8})`);
          gradient.addColorStop(1, `hsla(${hue}, 90%, 70%, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(finalX, finalY, size, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      
      ctx.restore();
    }
  };

  const drawNeural = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const time = Date.now() * 0.001;
    const nodes: Array<{x: number, y: number, amplitude: number}> = [];
    
    // Create neural network nodes
    for (let i = 0; i < data.length; i++) {
      const amplitude = Math.max(0, Math.min(1, data[i] || 0));
      const x = (Math.random() * 0.8 + 0.1) * canvas.width;
      const y = (Math.random() * 0.8 + 0.1) * canvas.height;
      nodes.push({ x, y, amplitude });
    }
    
    // Draw connections between active nodes
    nodes.forEach((nodeA, i) => {
      nodes.forEach((nodeB, j) => {
        if (i >= j) return;
        
        const distance = Math.sqrt((nodeA.x - nodeB.x) ** 2 + (nodeA.y - nodeB.y) ** 2);
        const maxDistance = 200;
        
        if (distance < maxDistance && (nodeA.amplitude > 0.3 || nodeB.amplitude > 0.3)) {
          const opacity = (1 - distance / maxDistance) * Math.max(nodeA.amplitude, nodeB.amplitude);
          const hue = (i * 10 + time * 50) % 360;
          
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${opacity * 0.6})`;
          ctx.lineWidth = Math.max(0.5, opacity * 3);
          ctx.beginPath();
          ctx.moveTo(nodeA.x, nodeA.y);
          ctx.lineTo(nodeB.x, nodeB.y);
          ctx.stroke();
        }
      });
    });
    
    // Draw nodes
    nodes.forEach((node, i) => {
      if (node.amplitude < 0.1) return;
      
      const size = Math.max(2, node.amplitude * 15);
      const hue = (i * 15 + time * 80) % 360;
      const pulse = Math.sin(time * 5 + i * 0.5) * 0.3 + 0.7;
      
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2);
      gradient.addColorStop(0, `hsla(${hue}, 90%, 70%, ${node.amplitude * pulse})`);
      gradient.addColorStop(1, `hsla(${hue}, 90%, 70%, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * pulse, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawPlasma = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const time = Date.now() * 0.001;
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Create plasma effect with audio reactivity
    const avgAmplitude = data.reduce((sum, val) => sum + val, 0) / data.length;
    const plasmaSpeed = 1 + avgAmplitude * 2;
    const plasmaIntensity = 0.5 + avgAmplitude * 0.5;
    
    for (let x = 0; x < canvas.width; x += 2) { // Skip pixels for performance
      for (let y = 0; y < canvas.height; y += 2) {
        const dataIndex = Math.floor((x / canvas.width) * (data.length - 1));
        const amplitude = data[dataIndex] || 0;
        
        // Plasma calculation
        const plasma = 
          Math.sin(x * 0.01 + time * plasmaSpeed) +
          Math.sin(y * 0.01 + time * plasmaSpeed * 0.7) +
          Math.sin((x + y) * 0.008 + time * plasmaSpeed * 1.3) +
          Math.sin(Math.sqrt(x * x + y * y) * 0.005 + time * plasmaSpeed * 0.5);
        
        const normalizedPlasma = (plasma + 4) / 8; // Normalize to 0-1
        const reactiveValue = normalizedPlasma * plasmaIntensity + amplitude * 0.3;
        
        const hue = (reactiveValue * 360 + time * 50) % 360;
        const saturation = 80 + amplitude * 20;
        const lightness = 30 + reactiveValue * 50;
        
        // Convert HSL to RGB (simplified)
        const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
        const x1 = c * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = lightness / 100 - c / 2;
        
        let r = 0, g = 0, b = 0;
        if (hue < 60) { r = c; g = x1; b = 0; }
        else if (hue < 120) { r = x1; g = c; b = 0; }
        else if (hue < 180) { r = 0; g = c; b = x1; }
        else if (hue < 240) { r = 0; g = x1; b = c; }
        else if (hue < 300) { r = x1; g = 0; b = c; }
        else { r = c; g = 0; b = x1; }
        
        const pixelIndex = (y * canvas.width + x) * 4;
        if (pixelIndex < pixels.length - 3) {
          pixels[pixelIndex] = Math.max(0, Math.min(255, (r + m) * 255));
          pixels[pixelIndex + 1] = Math.max(0, Math.min(255, (g + m) * 255));
          pixels[pixelIndex + 2] = Math.max(0, Math.min(255, (b + m) * 255));
          pixels[pixelIndex + 3] = Math.max(0, Math.min(255, reactiveValue * 255));
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const drawFractal = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.001;
    
    // Create fractal tree structure
    const drawBranch = (x: number, y: number, angle: number, length: number, depth: number, amplitude: number) => {
      if (depth <= 0 || length < 2) return;
      
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      
      if (!isFinite(endX) || !isFinite(endY)) return;
      
      const hue = (depth * 30 + time * 40 + amplitude * 120) % 360;
      const alpha = Math.max(0.1, amplitude * (depth / 8));
      
      ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
      ctx.lineWidth = Math.max(0.5, depth * amplitude);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Recursive branches
      const branchAngle = 0.5 + amplitude * 0.3;
      const lengthReduction = 0.7 + amplitude * 0.2;
      
      drawBranch(endX, endY, angle - branchAngle, length * lengthReduction, depth - 1, amplitude);
      drawBranch(endX, endY, angle + branchAngle, length * lengthReduction, depth - 1, amplitude);
    };
    
    // Draw multiple fractal trees
    data.forEach((amplitude, i) => {
      if (amplitude < 0.2) return;
      
      const safeAmplitude = Math.max(0, Math.min(1, amplitude));
      const angle = (i / data.length) * Math.PI * 2;
      const startX = centerX + Math.cos(angle) * 100;
      const startY = centerY + Math.sin(angle) * 100;
      const initialLength = 30 + safeAmplitude * 50;
      
      drawBranch(startX, startY, angle + Math.PI, initialLength, 6, safeAmplitude);
    });
  };

  const drawLiquid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) => {
    const time = Date.now() * 0.001;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Create liquid/fluid simulation
    const numDrops = Math.min(50, data.length);
    
    for (let i = 0; i < numDrops; i++) {
      const amplitude = Math.max(0, Math.min(1, data[i] || 0));
      if (amplitude < 0.1) continue;
      
      // Liquid drop physics
      const baseAngle = (i / numDrops) * Math.PI * 2;
      const flowAngle = baseAngle + Math.sin(time * 2 + i * 0.5) * amplitude * 0.5;
      const flowDistance = 100 + amplitude * 150 + Math.sin(time * 3 + i * 0.3) * 50;
      
      const x = centerX + Math.cos(flowAngle) * flowDistance;
      const y = centerY + Math.sin(flowAngle) * flowDistance + Math.sin(time * 4 + i * 0.7) * amplitude * 30;
      
      if (!isFinite(x) || !isFinite(y)) continue;
      
      // Liquid blob size varies with amplitude
      const blobSize = Math.max(5, amplitude * 40);
      const hue = (i * 12 + time * 60 + amplitude * 180) % 360;
      
      // Create liquid effect with multiple overlapping circles
      for (let blob = 0; blob < 3; blob++) {
        const blobOffset = blob * 10;
        const blobX = x + Math.cos(time * 5 + blob) * blobOffset * amplitude;
        const blobY = y + Math.sin(time * 5 + blob) * blobOffset * amplitude;
        const blobRadius = blobSize * (1 - blob * 0.2);
        
        const gradient = ctx.createRadialGradient(blobX, blobY, 0, blobX, blobY, blobRadius);
        gradient.addColorStop(0, `hsla(${hue + blob * 20}, 90%, 70%, ${amplitude * 0.8})`);
        gradient.addColorStop(0.7, `hsla(${hue + blob * 20}, 90%, 60%, ${amplitude * 0.4})`);
        gradient.addColorStop(1, `hsla(${hue + blob * 20}, 90%, 50%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blobX, blobY, blobRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add surface tension lines between nearby drops
      for (let j = i + 1; j < Math.min(i + 5, numDrops); j++) {
        const otherAmplitude = data[j] || 0;
        if (otherAmplitude < 0.1) continue;
        
        const otherAngle = (j / numDrops) * Math.PI * 2 + Math.sin(time * 2 + j * 0.5) * otherAmplitude * 0.5;
        const otherDistance = 100 + otherAmplitude * 150;
        const otherX = centerX + Math.cos(otherAngle) * otherDistance;
        const otherY = centerY + Math.sin(otherAngle) * otherDistance;
        
        const distance = Math.sqrt((x - otherX) ** 2 + (y - otherY) ** 2);
        if (distance < 100 && amplitude > 0.3 && otherAmplitude > 0.3) {
          const connectionStrength = Math.max(amplitude, otherAmplitude) * (1 - distance / 100);
          
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${connectionStrength * 0.3})`;
          ctx.lineWidth = Math.max(1, connectionStrength * 5);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(otherX, otherY);
          ctx.stroke();
        }
      }
    }
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
            { mode: 'kaleidoscope', icon: '🔮', label: 'Kaleidoscope' },
            { mode: 'neural', icon: '🧠', label: 'Neural Network' },
            { mode: 'plasma', icon: '⚡', label: 'Plasma Field' },
            { mode: 'fractal', icon: '🌿', label: 'Fractal Tree' },
            { mode: 'liquid', icon: '💧', label: 'Liquid Flow' }
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

              {/* Volume Slider */}
              <div className="flex items-center gap-2 ml-6">
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
                  className="w-24 h-1 bg-white/20 rounded-lg appearance-none slider cursor-pointer"
                />
                <span className="text-xs text-white/50 w-8">{Math.round(volume * 100)}%</span>
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