'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SpotifyAuth from '@/components/SpotifyAuth';
import MainVisualizer from '@/components/MainVisualizer';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function VisualizerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <SpotifyAuth onAuthSuccess={handleAuthSuccess} />;
  }

  const renderVisualizer = () => {
    return <MainVisualizer />;
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