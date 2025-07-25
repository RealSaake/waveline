'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      // Force immediate console log to verify this code is running
      console.log('🚀 CALLBACK PAGE LOADED - NEW VERSION');
      console.log('Current URL:', window.location.href);

      // Remove the alert for production

      const diagnostic: any = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        searchParams: window.location.search,
        code: null,
        error: null,
        steps: []
      };

      try {
        // Step 1: Parse parameters
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        diagnostic.code = code ? code.substring(0, 20) + '...' : null;
        diagnostic.error = error;
        diagnostic.steps.push('URL_PARSED');

        console.log('🔍 SPOTIFY AUTH DIAGNOSTIC:', JSON.stringify(diagnostic, null, 2));

        if (error) {
          diagnostic.steps.push('ERROR_FOUND');
          setStatus('Authentication failed');
          setTimeout(() => router.push('/live'), 2000);
          return;
        }

        if (!code) {
          diagnostic.steps.push('NO_CODE');
          setStatus('No authorization code received');
          setTimeout(() => router.push('/live'), 2000);
          return;
        }

        // Step 2: Exchange code for token
        setStatus('Exchanging authorization code...');
        diagnostic.steps.push('TOKEN_EXCHANGE_START');

        const REDIRECT_URI = `${window.location.origin}/callback`;

        const response = await fetch('/api/spotify-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
        });

        diagnostic.steps.push(`API_RESPONSE_${response.status}`);

        if (response.ok) {
          const responseData = await response.json();
          diagnostic.steps.push('API_SUCCESS');

          if (responseData.success) {
            diagnostic.steps.push('AUTH_SUCCESS');
            setStatus('Authentication successful! Redirecting...');

            console.log('✅ SPOTIFY AUTH SUCCESS:', JSON.stringify(diagnostic, null, 2));
            setTimeout(() => router.push('/live'), 1000);
          } else {
            diagnostic.steps.push('NO_SUCCESS_FLAG');
            throw new Error('Authentication response invalid');
          }
        } else {
          const errorData = await response.text();
          diagnostic.steps.push('API_ERROR');
          diagnostic.apiError = errorData;
          throw new Error(`Authentication failed: ${errorData}`);
        }
      } catch (error: any) {
        diagnostic.steps.push('EXCEPTION');
        diagnostic.exception = error.message;
        console.log('❌ SPOTIFY AUTH FAILED:', JSON.stringify(diagnostic, null, 2));

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

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}