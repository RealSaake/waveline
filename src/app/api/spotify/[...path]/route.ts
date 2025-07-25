import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, setAuthCookie, refreshSpotifyToken, clearAuthCookie } from '@/lib/auth';

async function makeSpotifyRequest(path: string, tokens: any, options: RequestInit = {}) {
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
    console.error('Spotify proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = searchParams ? `${path}?${searchParams}` : path;
  
  return handleSpotifyRequest(request, fullPath);
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