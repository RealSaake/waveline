'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SpotifyAuth from '@/components/SpotifyAuth';
import MainVisualizer from '@/components/MainVisualizer';
import ErrorBoundary from '@/components/ErrorBoundary';

type VisualizerType = 'main';

export default function VisualizerPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [visualizerType, setVisualizerType] = useState<VisualizerType>('main');
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
    return <MainVisualizer accessToken={accessToken} />;
  };

  return (
    <ErrorBoundary>
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-black/30 text-white/70 hover:text-white hover:bg-black/40 transition-all backdrop-blur-sm"
        >
          ← Back
        </button>
      </div>

      {renderVisualizer()}
    </ErrorBoundary>
  );
}