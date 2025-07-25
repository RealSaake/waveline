import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, setAuthCookie, refreshSpotifyToken, clearAuthCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    let tokens = await getAuthCookie();
    
    if (!tokens) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    // Check if token is expired
    if (Date.now() >= tokens.expires_at) {
      // Try to refresh the token
      const refreshedTokens = await refreshSpotifyToken(tokens.refresh_token);
      
      if (!refreshedTokens) {
        await clearAuthCookie();
        return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
      }
      
      tokens = refreshedTokens;
      await setAuthCookie(tokens);
    }

    // Test if the token actually works
    const testResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!testResponse.ok) {
      // Token is invalid, try to refresh
      const refreshedTokens = await refreshSpotifyToken(tokens.refresh_token);
      
      if (!refreshedTokens) {
        await clearAuthCookie();
        return NextResponse.json({ error: 'Token invalid and refresh failed' }, { status: 401 });
      }
      
      await setAuthCookie(refreshedTokens);
      return NextResponse.json({ access_token: refreshedTokens.access_token });
    }

    // Token is valid
    return NextResponse.json({ access_token: tokens.access_token });

  } catch (error) {
    console.error('Token endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}