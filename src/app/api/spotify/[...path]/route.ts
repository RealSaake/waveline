import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, setAuthCookie, refreshSpotifyToken, clearAuthCookie } from '@/lib/auth';

// Input validation for API paths
function validateSpotifyPath(path: string): boolean {
  const allowedPaths = [
    'me/player/currently-playing',
    'me/player/play',
    'me/player/pause',
    'me/player/next',
    'me/player/previous',
    'me/player/volume',
    'me/player',
    'me/top/tracks',
    'me/playlists',
    'search'
  ];
  
  return allowedPaths.some(allowed => 
    path === allowed || path.startsWith(allowed + '?') || path.startsWith(allowed + '/')
  );
}

async function makeSpotifyRequest(path: string, tokens: any, options: RequestInit = {}) {
  // Validate the path to prevent unauthorized API access
  if (!validateSpotifyPath(path)) {
    throw new Error('Unauthorized API path');
  }
  
  const url = `https://api.spotify.com/v1/${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
}

async function handleSpotifyRequest(request: NextRequest, path: string) {
  try {
    let tokens = await getAuthCookie();
    
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if token is expired
    if (Date.now() >= tokens.expires_at) {
      const refreshedTokens = await refreshSpotifyToken(tokens.refresh_token);
      
      if (!refreshedTokens) {
        await clearAuthCookie();
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      }
      
      tokens = refreshedTokens;
      await setAuthCookie(tokens);
    }

    // Forward the request to Spotify
    const spotifyResponse = await makeSpotifyRequest(path, tokens, {
      method: request.method,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    // If we get a 401, try refreshing the token once more
    if (spotifyResponse.status === 401) {
      const refreshedTokens = await refreshSpotifyToken(tokens.refresh_token);
      
      if (!refreshedTokens) {
        await clearAuthCookie();
        return NextResponse.json({ error: 'Authentication expired' }, { status: 401 });
      }
      
      await setAuthCookie(refreshedTokens);
      
      // Retry the request with new token
      const retryResponse = await makeSpotifyRequest(path, refreshedTokens, {
        method: request.method,
        body: request.method !== 'GET' ? await request.text() : undefined,
      });
      
      const data = retryResponse.status === 204 ? null : await retryResponse.json();
      return NextResponse.json(data, { status: retryResponse.status });
    }

    // Handle successful response
    if (spotifyResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await spotifyResponse.json();
    return NextResponse.json(data, { status: spotifyResponse.status });

  } catch (error) {
    // Log detailed error server-side for debugging
    console.error('Spotify proxy error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error to client to prevent information leakage
    return NextResponse.json({ 
      error: 'Service temporarily unavailable' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join('/');
    
    // Validate and sanitize search parameters
    const searchParams = new URLSearchParams();
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      // Only allow safe parameter names and values
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) && value.length < 1000) {
        searchParams.set(key, value);
      }
    }
    
    const fullPath = searchParams.toString() ? `${path}?${searchParams.toString()}` : path;
    
    return handleSpotifyRequest(request, fullPath);
  } catch (error) {
    console.error('GET request validation error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  return handleSpotifyRequest(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  return handleSpotifyRequest(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  return handleSpotifyRequest(request, path);
}