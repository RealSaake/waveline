'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SpotifyAuth from '@/components/SpotifyAuth';
import MainVisualizer from '@/components/MainVisualizer';
import AudioAnalysisIndicator from '@/components/AudioAnalysisIndicator';
import RealAudioNotification from '@/components/RealAudioNotification';
import AudioDebugPanel from '@/components/AudioDebugPanel';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';

export default function VisualizerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const router = useRouter();
  const { audioData, hasRealAudio, isPlaying, currentTrack } = useSpotifyPlayer();

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
      {/* Back Button and Debug Toggle */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-black/30 text-white/70 hover:text-white hover:bg-black/40 transition-all backdrop-blur-sm"
        >
          ← Back
        </button>
        {isAuthenticated && (
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm ${
              showDebugPanel 
                ? 'bg-green-500/30 text-green-300 hover:bg-green-500/40' 
                : 'bg-black/30 text-white/70 hover:text-white hover:bg-black/40'
            }`}
          >
            🎵 Debug
          </button>
        )}
      </div>

      {renderVisualizer()}
      
      {/* Audio Analysis Indicator */}
      {isAuthenticated && (
        <>
          <AudioAnalysisIndicator 
            hasRealAudio={hasRealAudio}
            audioData={audioData}
            isPlaying={isPlaying}
          />
          <RealAudioNotification
            hasRealAudio={hasRealAudio}
            isPlaying={isPlaying}
            currentTrack={currentTrack}
          />
          {showDebugPanel && (
            <AudioDebugPanel
              audioData={audioData}
              hasRealAudio={hasRealAudio}
              isPlaying={isPlaying}
            />
          )}
        </>
      )}
    </ErrorBoundary>
  );
}