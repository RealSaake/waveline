'use client';

import { useState, useEffect } from 'react';

interface SpotifyAuthProps {
  onAuthSuccess: () => void;
}

export default function SpotifyAuth({ onAuthSuccess }: SpotifyAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = typeof window !== 'undefined' 
    ? `${window.location.origin}/callback`
    : 'http://localhost:3001/callback';
  const SCOPES = 'user-read-currently-playing user-read-playback-state streaming user-modify-playback-state user-read-private playlist-read-private playlist-read-collaborative';

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated) {
          onAuthSuccess();
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
      }
    };

    checkAuthStatus();
  }, [onAuthSuccess]);



  const handleLogin = () => {
    if (!CLIENT_ID) {
      console.error('Spotify Client ID not configured');
      return;
    }

    setIsAuthenticating(true);
    
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `show_dialog=true`;
    
    window.location.href = authUrl;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-6xl mb-6">🎵</div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Wave<span className="text-purple-400">line</span> Live
          </h1>
          <p className="text-gray-300 mb-8">
            Connect your Spotify account to see real-time visualizations of your currently playing music
          </p>
          
          <button
            onClick={handleLogin}
            disabled={isAuthenticating}
            className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isAuthenticating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Connect to Spotify
              </>
            )}
          </button>
          
          <div className="mt-6 text-xs text-gray-400">
            <p>We'll access your:</p>
            <ul className="mt-2 space-y-1">
              <li>• Currently playing track</li>
              <li>• Playback controls</li>
              <li>• Audio features for visualization</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}