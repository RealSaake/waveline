'use client';

import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-4">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold mb-4">Upload Feature Coming Soon</h1>
        <p className="text-gray-300 mb-6">
          We're working on allowing you to upload your own music files for visualization.
        </p>
        <button
          onClick={() => router.push('/live')}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Try Live Spotify Mode
        </button>
      </div>
    </div>
  );
}