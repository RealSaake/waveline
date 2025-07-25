'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import TrackCard from './TrackCard';

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  preview_url: string | null;
}

interface AudioFeatures {
  id: string;
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
}

interface PlaylistData {
  name: string;
  description: string;
  tracks: Track[];
  audioFeatures: AudioFeatures[];
}

interface MoodboardProps {
  playlistData: PlaylistData;
  onReset: () => void;
}

export default function Moodboard({ playlistData, onReset }: MoodboardProps) {
  const [averageValence, setAverageValence] = useState(0.5);

  useEffect(() => {
    if (playlistData.audioFeatures.length > 0) {
      const totalValence = playlistData.audioFeatures.reduce((sum, features) => sum + features.valence, 0);
      setAverageValence(totalValence / playlistData.audioFeatures.length);
    }
  }, [playlistData]);

  const getBackgroundGradient = () => {
    if (averageValence > 0.7) {
      return 'from-yellow-400 via-orange-500 to-red-500'; // Happy/energetic
    } else if (averageValence > 0.4) {
      return 'from-blue-500 via-purple-500 to-indigo-600'; // Neutral
    } else {
      return 'from-gray-700 via-blue-800 to-indigo-900'; // Sad/melancholic
    }
  };

  const exportMoodboard = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const moodboardElement = document.getElementById('moodboard-container');
      
      if (!moodboardElement) {
        alert('Could not find moodboard to export');
        return;
      }

      // Create canvas from the moodboard with better options
      const canvas = await html2canvas(moodboardElement, {
        backgroundColor: '#1e1b4b', // Fallback background
        scale: 1, // Reduce scale to avoid memory issues
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          // Skip elements that might cause issues
          return element.classList?.contains('animate-pulse') || false;
        },
        onclone: (clonedDoc) => {
          // Fix any problematic CSS in the cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * { 
              color: rgb(255, 255, 255) !important; 
              background: linear-gradient(to bottom right, rgb(30, 27, 75), rgb(79, 70, 229)) !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      // Create download link
      const link = document.createElement('a');
      const fileName = playlistData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'moodboard';
      link.download = `${fileName}_moodboard.png`;
      link.href = canvas.toDataURL('image/png', 0.9);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      // Fallback: try a simpler approach
      try {
        window.print();
      } catch (printError) {
        alert('Export failed. Try using your browser\'s screenshot feature instead.');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{playlistData.name}</h2>
          {playlistData.description && (
            <p className="text-gray-300 max-w-2xl">{playlistData.description}</p>
          )}
          <div className="space-y-3 mt-4">
            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
              <span>{playlistData.tracks.length} tracks</span>
              <span>•</span>
              <span>Overall Mood: {(averageValence * 100).toFixed(0)}% positive</span>
              <span>•</span>
              <span>
                {averageValence > 0.7 ? '😊 Upbeat & Happy' : 
                 averageValence > 0.4 ? '😐 Balanced Mood' : '😔 Melancholic & Chill'}
              </span>
            </div>
            
            {/* Visual Guide */}
            <div className="bg-black/20 rounded-lg p-4 text-xs text-gray-300">
              <h4 className="font-medium mb-2 text-white">Visual Guide:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-6 bg-gradient-to-t from-blue-500 to-blue-300 rounded"></div>
                    <span>Waveforms = Energy levels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span>Yellow dots = Tempo (BPM)</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1 h-3 bg-green-400 rounded"></div>
                      <div className="w-1 h-2 bg-yellow-400 rounded"></div>
                      <div className="w-1 h-1 bg-red-400 rounded"></div>
                    </div>
                    <span>Color bars = Mood (green=happy, red=sad)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                    <span>Background = Overall playlist vibe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={exportMoodboard}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Export PNG
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            New Playlist
          </button>
        </div>
      </div>

      {/* Moodboard Grid */}
      <div id="moodboard-container" className={`min-h-screen bg-gradient-to-br ${getBackgroundGradient()} rounded-2xl p-6 relative overflow-hidden`}>
        {/* Dynamic Audio Visualization Background */}
        <div className="absolute inset-0 opacity-20">
          {/* Main Waveform */}
          <div className="flex items-end justify-center h-full space-x-1">
            {[...Array(100)].map((_, i) => {
              const avgEnergy = playlistData.audioFeatures.reduce((sum, af) => sum + af.energy, 0) / playlistData.audioFeatures.length;
              const avgTempo = playlistData.audioFeatures.reduce((sum, af) => sum + af.tempo, 0) / playlistData.audioFeatures.length;
              
              return (
                <motion.div
                  key={i}
                  className="rounded-t"
                  style={{
                    width: '3px',
                    backgroundColor: averageValence > 0.6 ? '#10b981' : 
                                   averageValence > 0.4 ? '#f59e0b' : '#ef4444',
                    minHeight: '10px',
                  }}
                  animate={{
                    height: [
                      `${20 + avgEnergy * 150 + Math.sin(i * 0.1) * 50}px`,
                      `${40 + avgEnergy * 120 + Math.sin(i * 0.05) * 30}px`,
                      `${20 + avgEnergy * 150 + Math.sin(i * 0.1) * 50}px`,
                    ],
                  }}
                  transition={{
                    duration: 60 / avgTempo,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.02,
                  }}
                />
              );
            })}
          </div>
          
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: averageValence > 0.6 ? '#10b981' : 
                               averageValence > 0.4 ? '#f59e0b' : '#ef4444',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, -40, -20],
                x: [0, Math.random() * 40 - 20, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlistData.tracks.map((track, index) => {
            const audioFeatures = playlistData.audioFeatures.find(af => af.id === track.id);
            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <TrackCard track={track} audioFeatures={audioFeatures} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}