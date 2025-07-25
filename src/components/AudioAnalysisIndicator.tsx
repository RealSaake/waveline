'use client';

import { useEffect, useState } from 'react';

interface AudioAnalysisIndicatorProps {
  hasRealAudio: boolean;
  audioData: {
    frequencies: Uint8Array;
    volume: number;
    bassLevel: number;
    midLevel: number;
    trebleLevel: number;
  } | null;
  isPlaying: boolean;
}

export default function AudioAnalysisIndicator({ 
  hasRealAudio, 
  audioData, 
  isPlaying 
}: AudioAnalysisIndicatorProps) {
  const [peakLevel, setPeakLevel] = useState(0);

  useEffect(() => {
    if (audioData && isPlaying) {
      const currentPeak = Math.max(audioData.bassLevel, audioData.midLevel, audioData.trebleLevel);
      setPeakLevel(currentPeak);
    } else {
      setPeakLevel(0);
    }
  }, [audioData, isPlaying]);

  return (
    <div className="fixed top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white text-sm z-50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${hasRealAudio ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <span className="font-medium">
          {hasRealAudio ? 'Real Audio Analysis' : 'Simulated Audio'}
        </span>
      </div>
      
      {audioData && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Bass:</span>
            <span>{(audioData.bassLevel * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Mid:</span>
            <span>{(audioData.midLevel * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Treble:</span>
            <span>{(audioData.trebleLevel * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-xs font-medium">
            <span>Peak:</span>
            <span className={peakLevel > 0.7 ? 'text-red-400' : peakLevel > 0.4 ? 'text-yellow-400' : 'text-green-400'}>
              {(peakLevel * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
      
      <div className="mt-2 text-xs opacity-70">
        {hasRealAudio 
          ? '🎵 Synced to Spotify playback' 
          : '⚠️ Connect Spotify for real audio'
        }
      </div>
    </div>
  );
}