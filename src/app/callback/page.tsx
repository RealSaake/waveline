'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      console.log('Callback page loaded');
      console.log('Current URL:', window.location.href);
      console.log('Search params:', window.location.search);
      
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      console.log('Authorization code:', code ? 'Found' : 'Not found');
      console.log('Error parameter:', error || 'None');

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
        console.log('Starting token exchange with code:', code.substring(0, 20) + '...');
        
        const REDIRECT_URI = `${window.location.origin}/callback`;
        console.log('Using redirect URI:', REDIRECT_URI);

        const response = await fetch('/api/spotify-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
        });

        console.log('Auth API response status:', response.status);
        console.log('Auth API response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          const responseData = await response.json();
          console.log('Auth API response data:', responseData);
          
          const { access_token } = responseData;
          
          if (access_token) {
            console.log('Successfully received access token');
            localStorage.setItem('spotify_access_token', access_token);
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => router.push('/live'), 1000);
          } else {
            console.error('No access token in response');
            throw new Error('No access token received');
          }
        } else {
          const errorData = await response.text();
          console.error('Auth API failed:', response.status, errorData);
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