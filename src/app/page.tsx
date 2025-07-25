'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(119,198,255,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8"
          >
            <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-4">
              Wave<span className="text-white">line</span>
            </h1>
            <div className="text-2xl md:text-3xl font-bold text-white/80 tracking-wider">
              AUDIO • VISUALIZATION • PERFECTION
            </div>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            The most <span className="text-purple-400 font-bold">insane audio visualizer</span> ever created. 
            Real-time particle systems, beat detection, and mind-bending visual effects that sync perfectly with your music.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex gap-6 justify-center flex-wrap mb-16"
          >
            <Link 
              href="/live" 
              className="group px-12 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xl rounded-2xl transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
            >
              <span className="flex items-center gap-3">
                🚀 EXPERIENCE THE MAGIC
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            
            <Link 
              href="/upload" 
              prefetch={false}
              className="px-12 py-6 bg-white/10 hover:bg-white/20 backdrop-blur-lg text-white font-bold text-xl rounded-2xl border border-white/20 transition-all transform hover:scale-105"
            >
              📁 Upload Audio
            </Link>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {[
            { icon: '✨', title: 'Particle Storm', desc: 'Thousands of particles dancing to your music' },
            { icon: '🌊', title: 'Wave Motion', desc: 'Fluid wave patterns that flow with the beat' },
            { icon: '🌌', title: 'Galaxy Mode', desc: 'Spiral galaxies that pulse with bass drops' },
            { icon: '🧠', title: 'Neural Network', desc: 'AI-powered connections that visualize harmony' }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
              className="group bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:border-purple-500/50 transition-all hover:bg-white/10"
            >
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Tech Specs */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-lg rounded-3xl p-12 border border-white/10 mb-20"
        >
          <h2 className="text-4xl font-bold text-white mb-8 text-center">TECHNICAL SUPERIORITY</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-black text-purple-400 mb-2">2048</div>
              <div className="text-white font-semibold">FFT Resolution</div>
              <div className="text-gray-400 text-sm">Ultra-high frequency analysis</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-pink-400 mb-2">60fps</div>
              <div className="text-white font-semibold">Smooth Animation</div>
              <div className="text-gray-400 text-sm">Buttery smooth visuals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-blue-400 mb-2">∞</div>
              <div className="text-white font-semibold">Particles</div>
              <div className="text-gray-400 text-sm">Unlimited visual complexity</div>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-5xl font-black text-white mb-6">
            Ready to have your 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> mind blown</span>?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Connect your Spotify and experience audio visualization like never before. 
            This isn't just a visualizer – it's digital synesthesia.
          </p>
          
          <Link 
            href="/live" 
            className="group inline-block px-16 py-8 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white font-black text-2xl rounded-3xl transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30"
          >
            <span className="flex items-center gap-4">
              🎵 CONNECT SPOTIFY NOW
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </span>
          </Link>
          
          <div className="mt-8 text-gray-400 text-sm">
            No signup required • Works in any browser • Completely free
          </div>
        </motion.div>
      </div>
    </div>
  );
}