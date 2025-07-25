'use client';

import { useState, useEffect } from 'react';

interface DebugPanelProps {
  accessToken: string;
}

export default function DebugPanel({ accessToken }: DebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  const runDiagnostics = async () => {
    const info: any = {
      timestamp: new Date().toISOString(),
      token: accessToken ? `${accessToken.substring(0, 10)}...` : 'None',
      tests: {}
    };

    try {
      // Test health endpoint
      const healthResponse = await fetch('/api/health');
      info.tests.health = {
        status: healthResponse.status,
        data: await healthResponse.json()
      };

      // Test currently-playing endpoint
      const currentlyPlayingResponse = await fetch('/api/currently-playing', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      info.tests.currentlyPlaying = {
        status: currentlyPlayingResponse.status,
        data: currentlyPlayingResponse.ok ? await currentlyPlayingResponse.json() : await currentlyPlayingResponse.text()
      };

      // Test direct Spotify API
      const spotifyResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      info.tests.spotifyDirect = {
        status: spotifyResponse.status,
        data: spotifyResponse.ok ? await spotifyResponse.json() : await spotifyResponse.text()
      };

    } catch (error) {
      info.error = error.message;
    }

    setDebugInfo(info);
  };

  useEffect(() => {
    if (accessToken) {
      runDiagnostics();
    }
  }, [accessToken]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm backdrop-blur-sm"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-4 bg-black/90 backdrop-blur-sm rounded-lg p-4 text-white text-xs overflow-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Debug Panel</h3>
        <div className="flex gap-2">
          <button
            onClick={runDiagnostics}
            className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded"
          >
            Refresh
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="bg-red-500/20 text-red-400 px-3 py-1 rounded"
          >
            Close
          </button>
        </div>
      </div>
      
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}