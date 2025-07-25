import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Spotify auth API called');
    const requestData = await request.json();
    console.log('Request data:', { 
      code: requestData.code ? requestData.code.substring(0, 20) + '...' : 'None',
      redirectUri: requestData.redirectUri 
    });
    
    const { code, redirectUri } = requestData;
    
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    console.log('Environment check:', {
      clientId: clientId ? 'Set' : 'Missing',
      clientSecret: clientSecret ? 'Set' : 'Missing'
    });

    if (!clientId || !clientSecret) {
      console.error('Spotify credentials not configured');
      return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
    }

    console.log('Making token exchange request to Spotify');
    
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

    console.log('Spotify token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, error);
      return NextResponse.json({ error: 'Failed to exchange code for token', details: error }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });
    
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });

  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: 'Authentication failed', details: error.message }, { status: 500 });
  }
}