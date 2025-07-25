'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SpotifyAuth from '@/components/SpotifyAuth';
import MainVisualizer from '@/components/MainVisualizer';

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

      
      <MainVisualizer accessToken={accessToken} />
    </ErrorBoundary>
  );
}