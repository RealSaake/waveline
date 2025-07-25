'use client';

import { useState } from 'react';
import SpotifyAuth from '@/components/SpotifyAuth';
import MainVisualizer from '@/components/MainVisualizer';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function LivePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <SpotifyAuth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <ErrorBoundary>
      <MainVisualizer />
    </ErrorBoundary>
  );
}