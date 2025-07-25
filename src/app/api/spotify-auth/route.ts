import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();
    
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
    }
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return NextResponse.json({ error: 'Failed to exchange code for token', details: error }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    
    // Store tokens securely in encrypted cookie
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
    };
    
    await setAuthCookie(tokens);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}