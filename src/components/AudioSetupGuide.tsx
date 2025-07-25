'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioSetupGuideProps {
  hasRealAudio: boolean;
  error?: string | null;
}

export default function AudioSetupGuide({ hasRealAudio, error }: AudioSetupGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (hasRealAudio) return null; // Don't show if audio is working

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 bg-yellow-500/20 hover:bg-yellow-500/30 backdrop-blur-md rounded-full p-3 text-yellow-400 transition-colors z-50"
        title="Audio Setup Help"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold">Get Real Audio Visualization</h3>
              </div>

              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h4 className="text-white font-medium mb-2">Why am I seeing simulated audio?</h4>
                  <p>The visualizer is currently using simulated audio data instead of analyzing your actual music. This happens when:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                    <li>Spotify Web Playback SDK couldn't connect</li>
                    <li>Browser doesn't support Web Audio API</li>
                    <li>Audio permissions were denied</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2">How to get real audio analysis:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400">
                    <li>Make sure you have <strong className="text-white">Spotify Premium</strong> (required for Web Playback)</li>
                    <li>Use a <strong className="text-white">supported browser</strong> (Chrome, Firefox, Safari, Edge)</li>
                    <li>Allow audio permissions when prompted</li>
                    <li>Play music through this web player (not your Spotify app)</li>
                    <li>Refresh the page if needed</li>
                  </ol>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <h4 className="text-red-400 font-medium mb-1">Current Error:</h4>
                    <p className="text-red-300 text-xs">{error}</p>
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <h4 className="text-blue-400 font-medium mb-1">Pro Tip:</h4>
                  <p className="text-blue-300 text-xs">
                    Even with simulated audio, the visualizations are still reactive to your track's metadata like energy, tempo, and mood!
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Retry Connection
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}