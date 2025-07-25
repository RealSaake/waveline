'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SpotifyAuth from '@/components/SpotifyAuth';
import CleanVisualizer from '@/components/CleanVisualizer';
import RealTimeAudioVisualizer from '@/components/RealTimeAudioVisualizer';
import HybridVisualizer from '@/components/HybridVisualizer';
import ErrorBoundary from '@/components/ErrorBoundary';

type VisualizerType = 'clean' | 'realtime' | 'hybrid';

export default function VisualizerPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [visualizerType, setVisualizerType] = useState<VisualizerType>('clean');
  const router = useRouter();

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('spotify_access_token');
    if (token) {
      setAccessToken(token);
    }
  }, []);

  const handleAuthSuccess = (token: string) => {
    setAccessToken(token);
  };

  if (!accessToken) {
    return <SpotifyAuth onAuthSuccess={handleAuthSuccess} />;
  }

  const renderVisualizer = () => {
    switch (visualizerType) {
      case 'clean':
        return <CleanVisualizer accessToken={accessToken} />;
      case 'realtime':
        return <RealTimeAudioVisualizer accessToken={accessToken} />;
      case 'hybrid':
        return <HybridVisualizer accessToken={accessToken} />;
      default:
        return <CleanVisualizer accessToken={accessToken} />;
    }
  };

  return (
    <ErrorBoundary>
      {/* Visualizer Type Selector */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => setVisualizerType('clean')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm ${
            visualizerType === 'clean'
              ? 'bg-green-500/30 text-green-400 border border-green-400/50'
              : 'bg-black/20 text-white/70 hover:bg-white/10'
          }`}
        >
          ✨ Clean Mode
        </button>
        
        <button
          onClick={() => setVisualizerType('realtime')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm ${
            visualizerType === 'realtime'
              ? 'bg-purple-500/30 text-purple-400 border border-purple-400/50'
              : 'bg-black/20 text-white/70 hover:bg-white/10'
          }`}
        >
          🔊 Real-time Audio
        </button>
        
        <button
          onClick={() => setVisualizerType('hybrid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm ${
            visualizerType === 'hybrid'
              ? 'bg-blue-500/30 text-blue-400 border border-blue-400/50'
              : 'bg-black/20 text-white/70 hover:bg-white/10'
          }`}
        >
          ⚡ Smart Hybrid
        </button>

        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all backdrop-blur-sm"
        >
          ← Back
        </button>
      </div>

      {renderVisualizer()}
    </ErrorBoundary>
  );
}