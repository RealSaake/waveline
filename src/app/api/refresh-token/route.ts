import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();
    
    if (!refresh_token) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 400 });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token refresh failed:', error);
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 400 });
    }

    const tokenData = await response.json();
    
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refresh_token, // Use new refresh token if provided
      expires_in: tokenData.expires_in,
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}