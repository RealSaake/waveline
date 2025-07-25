'use client';

import { useState, useEffect } from 'react';
import SpotifyAuth from '@/components/SpotifyAuth';
import RealTimeVisualizer from '@/components/RealTimeVisualizer';

export default function LivePage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

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

  return <RealTimeVisualizer accessToken={accessToken} />;
}