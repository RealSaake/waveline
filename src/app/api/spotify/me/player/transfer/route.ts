import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, refreshSpotifyToken, setAuthCookie, clearAuthCookie } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    let tokens = await getAuthCookie();
    
    if (!tokens) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if token is expired and refresh if needed
    if (Date.now() >= tokens.expires_at) {
      const refreshedTokens = await refreshSpotifyToken(tokens.refresh_token);
      
      if (!refreshedTokens) {
        await clearAuthCookie();
        return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
      }
      
      tokens = refreshedTokens;
      await setAuthCookie(tokens);
    }

    const body = await request.json();
    const { device_ids, play = true } = body;

    if (!device_ids || !Array.isArray(device_ids) || device_ids.length === 0) {
      return NextResponse.json({ error: 'device_ids array is required' }, { status: 400 });
    }

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids,
        play,
      }),
    });

    if (response.ok || response.status === 204) {
      return NextResponse.json({ success: true });
    } else {
      const errorText = await response.text();
      console.error('Spotify transfer playback error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to transfer playback' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Transfer playback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}