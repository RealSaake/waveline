'use client';

import { useEffect, useRef } from 'react';

interface AudioDebugPanelProps {
  audioData: {
    frequencies: Uint8Array;
    volume: number;
    bassLevel: number;
    midLevel: number;
    trebleLevel: number;
  } | null;
  hasRealAudio: boolean;
  isPlaying: boolean;
}

export default function AudioDebugPanel({ audioData, hasRealAudio, isPlaying }: AudioDebugPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !audioData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const { frequencies } = audioData;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw frequency bars
    const barWidth = canvas.width / frequencies.length;
    
    for (let i = 0; i < frequencies.length; i++) {
      const barHeight = (frequencies[i] / 255) * canvas.height;
      
      // Color based on frequency range
      let color;
      if (i < frequencies.length * 0.15) {
        color = `rgb(255, ${Math.floor(frequencies[i])}, 0)`; // Bass - red to yellow
      } else if (i < frequencies.length * 0.6) {
        color = `rgb(0, ${Math.floor(frequencies[i])}, 255)`; // Mid - blue to cyan
      } else {
        color = `rgb(${Math.floor(frequencies[i])}, 255, 0)`; // Treble - green to yellow
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
    }

    // Draw level indicators
    ctx.fillStyle = 'white';
    ctx.font = '10px monospace';
    ctx.fillText(`Bass: ${(audioData.bassLevel * 100).toFixed(0)}%`, 5, 15);
    ctx.fillText(`Mid: ${(audioData.midLevel * 100).toFixed(0)}%`, 5, 30);
    ctx.fillText(`Treble: ${(audioData.trebleLevel * 100).toFixed(0)}%`, 5, 45);
    ctx.fillText(`Volume: ${(audioData.volume * 100).toFixed(0)}%`, 5, 60);
    
    // Status indicator
    ctx.fillStyle = hasRealAudio ? '#00ff00' : '#ffff00';
    ctx.fillText(hasRealAudio ? 'REAL AUDIO' : 'SIMULATED', 5, canvas.height - 5);
    
  }, [audioData, hasRealAudio]);

  if (!isPlaying) {
    return (
      <div className="fixed bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <div className="text-center text-gray-400">
          ⏸️ Audio analysis paused
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3">
      <div className="text-white text-xs mb-2 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${hasRealAudio ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <span>Real-time Frequency Analysis</span>
      </div>
      <canvas
        ref={canvasRef}
        width={200}
        height={100}
        className="border border-gray-600 rounded"
      />
      <div className="text-xs text-gray-400 mt-1 text-center">
        {hasRealAudio ? '🎵 Live Spotify Audio' : '⚠️ Demo Mode'}
      </div>
    </div>
  );
}