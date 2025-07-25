'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('Spotify auth error:', error);
        setStatus('Authentication failed');
        setTimeout(() => router.push('/live'), 2000);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        setStatus('No authorization code received');
        setTimeout(() => router.push('/live'), 2000);
        return;
      }

      try {
        setStatus('Exchanging authorization code...');
        
        const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '89f8ec139aa2450db2ca6eee826948e9';
        const REDIRECT_URI = `${window.location.origin}/callback`;

        console.log('Exchanging code for token...');
        const response = await fetch('/api/spotify-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
        });

        console.log('Auth response status:', response.status);

        if (response.ok) {
          const { access_token } = await response.json();
          console.log('Got access token:', access_token ? 'Success' : 'Failed');
          
          if (access_token) {
            localStorage.setItem('spotify_access_token', access_token);
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => router.push('/live'), 1000);
          } else {
            throw new Error('No access token received');
          }
        } else {
          const errorData = await response.text();
          console.error('Auth failed:', response.status, errorData);
          throw new Error(`Authentication failed: ${errorData}`);
        }
      } catch (error) {
        console.error('Token exchange failed:', error);
        setStatus('Authentication failed. Redirecting...');
        setTimeout(() => router.push('/live'), 2000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="text-center text-white">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p>{status}</p>
      </div>
    </div>
  );
}