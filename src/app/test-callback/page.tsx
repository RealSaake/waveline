'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function TestCallbackContent() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    console.log('🧪 TEST CALLBACK PAGE LOADED');
    console.log('URL:', window.location.href);
    console.log('Search params:', window.location.search);
    
    const code = searchParams.get('code');
    
    if (code) {
      console.log('✅ Authorization code found:', code.substring(0, 20) + '...');
      alert(`Code found: ${code.substring(0, 20)}...`);
    } else {
      console.log('❌ No authorization code found');
      alert('No code found in URL');
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-red-500">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold">TEST CALLBACK PAGE</h1>
        <p>Check console for debug info</p>
        <p>URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
      </div>
    </div>
  );
}

export default function TestCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-red-500">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold">LOADING TEST PAGE...</h1>
        </div>
      </div>
    }>
      <TestCallbackContent />
    </Suspense>
  );
}