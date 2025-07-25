'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface PlaylistInputProps {
  onSubmit: (playlistUrl: string) => void;
  loading: boolean;
  error: string | null;
}

export default function PlaylistInput({ onSubmit, loading, error }: PlaylistInputProps) {
  const [playlistUrl, setPlaylistUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playlistUrl.trim()) {
      onSubmit(playlistUrl.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="playlist-url" className="block text-white text-lg font-medium mb-3">
              Spotify Playlist URL
            </label>
            <input
              id="playlist-url"
              type="url"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || !playlistUrl.trim()}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Generating Moodboard...</span>
              </div>
            ) : (
              'Generate Moodboard'
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-yellow-400 font-medium mb-2">How to use Waveline:</h3>
            <div className="text-gray-300 text-sm space-y-2 text-left">
              <p>1. <strong>Create your own playlist</strong> on Spotify</p>
              <p>2. <strong>Make it public</strong> (not private)</p>
              <p>3. <strong>Copy the playlist URL</strong> and paste it above</p>
            </div>
            <p className="text-gray-400 text-xs mt-3">
              ⚠️ Spotify's curated playlists (like "Today's Top Hits") are not accessible via API due to licensing restrictions.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}