'use client';

import { useEffect, useState } from 'react';

interface AudioDebugPanelProps {
  audioData: any;
  hasRealAudio: boolean;
  isPlaying: boolean;
}

export default function AudioDebugPanel({ audioData, hasRealAudio, isPlaying }: AudioDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    setDebugInfo({
      hasWebAudioAPI: !!(window.AudioContext || (window as any).webkitAudioContext),
      hasSpotifySDK: !!window.Spotify,
      userAgent: navigator.userAgent,
      audioContextState: 'unknown',
      frequencyDataLength: audioData?.frequencies?.length || 0,
      lastUpdate: new Date().toLocaleTimeString(),
    });
  }, [audioData]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-20 right-6 bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-md rounded-lg px-3 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors z-40"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-6 bg-gray-900/90 backdrop-blur-md rounded-lg p-4 text-xs text-gray-300 max-w-xs z-40 border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-white font-medium">Audio Debug</h4>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-300"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Real Audio:</span>
          <span className={hasRealAudio ? 'text-green-400' : 'text-red-400'}>
            {hasRealAudio ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Playing:</span>
          <span className={isPlaying ? 'text-green-400' : 'text-gray-400'}>
            {isPlaying ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Web Audio API:</span>
          <span className={debugInfo.hasWebAudioAPI ? 'text-green-400' : 'text-red-400'}>
            {debugInfo.hasWebAudioAPI ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Spotify SDK:</span>
          <span className={debugInfo.hasSpotifySDK ? 'text-green-400' : 'text-red-400'}>
            {debugInfo.hasSpotifySDK ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Frequency Bins:</span>
          <span className="text-blue-400">{debugInfo.frequencyDataLength}</span>
        </div>

        {audioData && (
          <>
            <div className="flex justify-between">
              <span>Bass Level:</span>
              <span className="text-red-400">{Math.round(audioData.bassLevel * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Mid Level:</span>
              <span className="text-yellow-400">{Math.round(audioData.midLevel * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Treble Level:</span>
              <span className="text-blue-400">{Math.round(audioData.trebleLevel * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Volume:</span>
              <span className="text-green-400">{Math.round(audioData.volume * 100)}%</span>
            </div>
          </>
        )}

        <div className="pt-2 border-t border-gray-700">
          <div className="text-gray-500">Last Update: {debugInfo.lastUpdate}</div>
        </div>

        {/* Frequency Visualization */}
        {audioData?.frequencies && (
          <div className="pt-2 border-t border-gray-700">
            <div className="text-gray-400 mb-1">Frequency Spectrum:</div>
            <div className="flex items-end gap-px h-8">
              {Array.from(audioData.frequencies).slice(0, 32).map((value: number, i: number) => (
                <div
                  key={i}
                  className="bg-blue-400 w-1"
                  style={{ height: `${(value / 255) * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}