'use client';

export default function TestAuth() {
  const testSpotifyAuth = () => {
    const CLIENT_ID = '89f8ec139aa2450db2ca6eee826948e9';
    const REDIRECT_URI = 'https://waveline.vercel.app/callback';
    const SCOPE = 'user-read-currently-playing';
    
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(SCOPE)}`;
    
    console.log('Test auth URL:', authUrl);
    window.open(authUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <h1 className="text-2xl font-bold text-white mb-4">Spotify Auth Test</h1>
        <button
          onClick={testSpotifyAuth}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg"
        >
          Test Spotify Auth (New Tab)
        </button>
        <p className="text-gray-300 text-sm mt-4">
          This will open Spotify auth in a new tab to test if the basic auth flow works.
        </p>
      </div>
    </div>
  );
}