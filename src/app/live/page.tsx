'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SpotifyAuth from '@/components/SpotifyAuth';
import InstantVisualizer from '@/components/InstantVisualizer';
import DebugPanel from '@/components/DebugPanel';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function LivePage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('spotify_access_token');
    console.log('Live page - Checking for stored token:', token ? 'Found' : 'Not found');
    if (token) {
      console.log('Live page - Setting access token');
      setAccessToken(token);
    }
  }, []);

  const handleAuthSuccess = (token: string) => {
    setAccessToken(token);
  };

  if (!accessToken) {
    return <SpotifyAuth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <ErrorBoundary>
      {/* Quick access to visualizer selector */}
      <div className="absolute top-4 right-20 z-50">
        <button
          onClick={() => router.push('/visualizer')}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg text-sm font-medium backdrop-blur-sm transition-all"
        >
          🎛️ Switch Mode
        </button>
      </div>
      
      <InstantVisualizer accessToken={accessToken} />
      <DebugPanel accessToken={accessToken} />
    </ErrorBoundary>
  );
}