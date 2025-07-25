'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GenerativeVisualizer from '@/components/GenerativeVisualizer';
import { motion } from 'framer-motion';

interface ShareData {
  trackName: string;
  artists: string;
  album: string;
  visualMode: string;
  visualDNA: any;
  timestamp: number;
}

export default function SharedVisualizationPage() {
  const params = useParams();
  const router = useRouter();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShareData = async () => {
      try {
        const response = await fetch(`/api/share?id=${params.id}`);
        
        if (!response.ok) {
          throw new Error('Shared visualization not found');
        }
        
        const data = await response.json();
        setShareData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shared visualization');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchShareData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading shared visualization...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-4">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold mb-4">Visualization Not Found</h1>
          <p className="text-gray-300 mb-6">
            {error || 'This shared visualization may have expired or been removed.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Go to Waveline
          </button>
        </div>
      </div>
    );
  }

  // Generate mock audio data for the shared visualization
  const mockAudioData = {
    frequencies: new Uint8Array(128).map(() => Math.random() * 255),
    volume: 0.7,
    bassLevel: 0.6,
    midLevel: 0.5,
    trebleLevel: 0.4
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Shared Visualization */}
      <GenerativeVisualizer
        audioData={mockAudioData}
        visualDNA={shareData.visualDNA}
        width={typeof window !== 'undefined' ? window.innerWidth : 1920}
        height={typeof window !== 'undefined' ? window.innerHeight : 1080}
      />

      {/* Overlay with track info */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-6 left-6 right-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {shareData.trackName}
                </h1>
                <p className="text-gray-300">
                  by {shareData.artists} • {shareData.album}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                  <span>Visual Mode: {shareData.visualMode}</span>
                  <span>•</span>
                  <span>Shared {new Date(shareData.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl mb-2">🎵</div>
                <p className="text-sm text-gray-400">Shared via</p>
                <p className="text-lg font-bold text-purple-400">Waveline</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-6 left-6 right-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-lg text-white font-semibold rounded-lg transition-colors border border-white/20 pointer-events-auto"
            >
              ← Back to Waveline
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${shareData.trackName} - Waveline Visualization`,
                      text: `Check out this amazing visualization for "${shareData.trackName}" by ${shareData.artists}`,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }
                }}
                className="px-4 py-2 bg-purple-600/80 hover:bg-purple-600 backdrop-blur-lg text-white font-medium rounded-lg transition-colors border border-purple-500/30 pointer-events-auto"
              >
                Share
              </button>
              
              <button
                onClick={() => router.push('/live')}
                className="px-6 py-3 bg-green-600/80 hover:bg-green-600 backdrop-blur-lg text-white font-semibold rounded-lg transition-colors border border-green-500/30 pointer-events-auto"
              >
                Create Your Own
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Visual DNA info panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute top-1/2 right-6 transform -translate-y-1/2 bg-black/20 backdrop-blur-lg rounded-xl p-4 border border-white/10 max-w-xs"
      >
        <h3 className="text-white font-semibold mb-3">Visual DNA</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: shareData.visualDNA.primaryColor }}
            ></div>
            <span className="text-gray-300">Primary</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: shareData.visualDNA.secondaryColor }}
            ></div>
            <span className="text-gray-300">Secondary</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: shareData.visualDNA.accentColor }}
            ></div>
            <span className="text-gray-300">Accent</span>
          </div>
          <div className="pt-2 border-t border-white/10">
            <p className="text-gray-400">Shape: {shareData.visualDNA.particleShape}</p>
            <p className="text-gray-400">Pattern: {shareData.visualDNA.flowPattern}</p>
            <p className="text-gray-400">Complexity: {shareData.visualDNA.complexity}/10</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}