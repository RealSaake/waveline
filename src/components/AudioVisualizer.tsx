'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  audioFeatures: {
    energy: number;
    valence: number;
    tempo: number;
    danceability: number;
  };
  isPlaying?: boolean;
}

export default function AudioVisualizer({ audioFeatures, isPlaying = true }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    // Initialize bars based on audio features
    const numBars = 64;
    const initialBars = Array.from({ length: numBars }, (_, i) => {
      const baseHeight = audioFeatures.energy * 100;
      const variation = Math.sin(i * 0.1) * audioFeatures.danceability * 50;
      return Math.max(5, baseHeight + variation);
    });
    setBars(initialBars);
  }, [audioFeatures]);

  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update bars based on tempo and energy
      setBars(prevBars => 
        prevBars.map((bar, i) => {
          const targetHeight = audioFeatures.energy * 100 + 
            Math.sin(Date.now() * 0.01 + i * 0.2) * audioFeatures.danceability * 30;
          return bar + (targetHeight - bar) * 0.1;
        })
      );

      // Draw bars
      const barWidth = canvas.width / bars.length;
      bars.forEach((height, i) => {
        const x = i * barWidth;
        const normalizedHeight = Math.max(2, height);
        
        // Color based on valence (mood)
        const hue = audioFeatures.valence * 120; // 0 = red, 120 = green
        const saturation = 70 + audioFeatures.energy * 30;
        const lightness = 50 + audioFeatures.danceability * 20;
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, canvas.height - normalizedHeight, barWidth - 1, normalizedHeight);
        
        // Add glow effect
        ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.shadowBlur = 10;
        ctx.fillRect(x, canvas.height - normalizedHeight, barWidth - 1, normalizedHeight);
        ctx.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bars, audioFeatures, isPlaying]);

  return (
    <div className="relative w-full h-32 bg-black/20 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={400}
        height={128}
        className="w-full h-full"
      />
      
      {/* Audio Feature Labels */}
      <div className="absolute top-2 left-2 text-xs text-white/80 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <span>Energy: {Math.round(audioFeatures.energy * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>Mood: {Math.round(audioFeatures.valence * 100)}%</span>
        </div>
      </div>
      
      <div className="absolute top-2 right-2 text-xs text-white/80 space-y-1">
        <div>{Math.round(audioFeatures.tempo)} BPM</div>
        <div>Dance: {Math.round(audioFeatures.danceability * 100)}%</div>
      </div>
      
      {/* Tempo Pulse Indicator */}
      <motion.div
        className="absolute bottom-2 left-2 w-3 h-3 bg-yellow-400 rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 60 / audioFeatures.tempo,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}