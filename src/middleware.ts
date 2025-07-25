import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Handle CORS for API routes with more restrictive settings
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Only allow same origin for sensitive API routes
    if (request.nextUrl.pathname.startsWith('/api/spotify/')) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      
      // Only allow requests from same origin for Spotify API
      if (origin && host && !origin.includes(host)) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};