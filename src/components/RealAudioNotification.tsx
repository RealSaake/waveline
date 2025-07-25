'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RealAudioNotificationProps {
  hasRealAudio: boolean;
  isPlaying: boolean;
  currentTrack: any;
}

export default function RealAudioNotification({ 
  hasRealAudio, 
  isPlaying, 
  currentTrack 
}: RealAudioNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'connected' | 'playing' | 'disconnected'>('connected');

  useEffect(() => {
    if (hasRealAudio && isPlaying && currentTrack) {
      setNotificationType('playing');
      setShowNotification(true);
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else if (hasRealAudio && !isPlaying) {
      setNotificationType('connected');
      setShowNotification(true);
      
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (!hasRealAudio && isPlaying) {
      setNotificationType('disconnected');
      setShowNotification(true);
      
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [hasRealAudio, isPlaying, currentTrack]);

  const getNotificationContent = () => {
    switch (notificationType) {
      case 'playing':
        return {
          icon: '🎵',
          title: 'Real Audio Analysis Active',
          message: 'Visualizations are synced to live Spotify playback',
          color: 'from-green-500 to-emerald-600'
        };
      case 'connected':
        return {
          icon: '🔗',
          title: 'Spotify SDK Connected',
          message: 'Ready for real-time audio visualization',
          color: 'from-blue-500 to-cyan-600'
        };
      case 'disconnected':
        return {
          icon: '⚠️',
          title: 'Using Simulated Audio',
          message: 'Connect Spotify Premium for real audio analysis',
          color: 'from-yellow-500 to-orange-600'
        };
    }
  };

  const content = getNotificationContent();

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`bg-gradient-to-r ${content.color} rounded-lg shadow-lg p-4 text-white max-w-sm`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{content.icon}</span>
              <div>
                <h3 className="font-semibold text-sm">{content.title}</h3>
                <p className="text-xs opacity-90">{content.message}</p>
              </div>
            </div>
            
            {/* Progress bar for auto-hide */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ 
                duration: notificationType === 'disconnected' ? 4 : notificationType === 'playing' ? 3 : 2,
                ease: 'linear'
              }}
              className="h-0.5 bg-white/30 mt-2 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}