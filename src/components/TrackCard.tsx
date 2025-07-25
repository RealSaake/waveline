'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

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

interface TrackCardProps {
  track: Track;
  audioFeatures?: AudioFeatures;
}

export default function TrackCard({ track, audioFeatures }: TrackCardProps) {
  const [dominantColor, setDominantColor] = useState('#6366f1');
  const [mounted, setMounted] = useState(false);

  const albumImage = track.album.images[0]?.url || '/placeholder-album.svg';
  const artistNames = track.artists.map(artist => artist.name).join(', ');

  useEffect(() => {
    setMounted(true);
    if (albumImage && albumImage !== '/placeholder-album.svg') {
      extractDominantColor(albumImage);
    }
  }, [albumImage]);

  const extractDominantColor = async (imageUrl: string) => {
    try {
      // Create a canvas to extract color from image
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;
        
        // Use smaller canvas for better performance
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        
        // Get image data and extract dominant color using color quantization
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        const colorCounts: { [key: string]: number } = {};
        
        // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += 16) {
          const r = Math.floor(data[i] / 32) * 32;
          const g = Math.floor(data[i + 1] / 32) * 32;
          const b = Math.floor(data[i + 2] / 32) * 32;
          
          // Skip very dark or very light colors
          if (r + g + b > 50 && r + g + b < 600) {
            const color = `${r},${g},${b}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }
        }
        
        // Find most common color
        let dominantColorKey = Object.keys(colorCounts)[0];
        let maxCount = 0;
        
        for (const [color, count] of Object.entries(colorCounts)) {
          if (count > maxCount) {
            maxCount = count;
            dominantColorKey = color;
          }
        }
        
        if (dominantColorKey) {
          setDominantColor(`rgb(${dominantColorKey})`);
        }
      };
      
      img.src = imageUrl;
    } catch (error) {
      console.error('Error extracting color:', error);
    }
  };

  const getValenceColor = (valence: number) => {
    if (valence > 0.7) return 'bg-green-400';
    if (valence > 0.4) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getEnergySize = (energy: number) => {
    return Math.max(8, energy * 16); // Min 8px, max 16px
  };

  return (
    <motion.div
      className="relative bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300 group"
      whileHover={{ scale: 1.02, y: -4 }}
      style={{
        boxShadow: `0 8px 32px ${dominantColor}20`,
      }}
    >
      {/* Album Art */}
      <div className="relative aspect-square">
        <Image
          src={albumImage}
          alt={`${track.album.name} cover`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onLoad={() => {/* Image loaded */}}
        />
        
        {/* Dominant Color Overlay */}
        <div 
          className="absolute inset-0 opacity-20 mix-blend-multiply"
          style={{ backgroundColor: dominantColor }}
        />
        
        {/* Spotify Embed Player */}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={() => {
              const spotifyUrl = `https://open.spotify.com/track/${track.id}`;
              window.open(spotifyUrl, '_blank');
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Play on Spotify
          </button>
        </div>

        {/* Audio Waveform Visualization */}
        {audioFeatures && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-end justify-center h-full px-2 gap-1">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="bg-white/60 rounded-t"
                  style={{
                    width: '2px',
                    minHeight: '4px',
                  }}
                  animate={{
                    height: [
                      `${4 + audioFeatures.energy * 30 + Math.sin(i * 0.5) * 10}px`,
                      `${8 + audioFeatures.energy * 25 + Math.sin(i * 0.3) * 8}px`,
                      `${4 + audioFeatures.energy * 30 + Math.sin(i * 0.5) * 10}px`,
                    ],
                  }}
                  transition={{
                    duration: 60 / audioFeatures.tempo,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.05,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">
          {track.name}
        </h3>
        <p className="text-gray-300 text-xs mb-3 line-clamp-1">
          {artistNames}
        </p>

        {/* Valence Bar */}
        {audioFeatures && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Mood</span>
              <span>{Math.round(audioFeatures.valence * 100)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getValenceColor(audioFeatures.valence)}`}
                style={{ width: `${audioFeatures.valence * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Audio Visualizer */}
        {audioFeatures && (
          <div className="mt-3">
            <div className="h-16 bg-black/30 rounded-lg overflow-hidden relative">
              {/* Mini Waveform */}
              <div className="flex items-end justify-center h-full px-2 gap-1">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-t"
                    style={{
                      width: '3px',
                      backgroundColor: dominantColor,
                      minHeight: '4px',
                    }}
                    animate={{
                      height: [
                        `${8 + audioFeatures.energy * 40 + Math.sin(i * 0.4) * 15}px`,
                        `${12 + audioFeatures.energy * 35 + Math.sin(i * 0.2) * 10}px`,
                        `${8 + audioFeatures.energy * 40 + Math.sin(i * 0.4) * 15}px`,
                      ],
                    }}
                    transition={{
                      duration: 60 / audioFeatures.tempo,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
              
              {/* Feature Indicators */}
              <div className="absolute top-1 left-2 flex gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: audioFeatures.valence > 0.6 ? '#10b981' : 
                                   audioFeatures.valence > 0.4 ? '#f59e0b' : '#ef4444'
                  }}
                  title={`Mood: ${Math.round(audioFeatures.valence * 100)}%`}
                />
                <motion.div
                  className="w-2 h-2 bg-yellow-400 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 60 / audioFeatures.tempo,
                    repeat: Infinity,
                  }}
                  title={`${Math.round(audioFeatures.tempo)} BPM`}
                />
              </div>
              
              <div className="absolute top-1 right-2 text-xs text-white/70">
                {Math.round(audioFeatures.energy * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}