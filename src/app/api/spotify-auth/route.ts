import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    requestReceived: true,
    code: null,
    redirectUri: null,
    credentials: {
      clientId: false,
      clientSecret: false
    },
    spotifyRequest: null,
    spotifyResponse: null,
    tokenData: null,
    steps: []
  };

  try {
    diagnostic.steps.push('API_START');
    
    const requestData = await request.json();
    const { code, redirectUri } = requestData;
    
    diagnostic.code = code ? code.substring(0, 20) + '...' : null;
    diagnostic.redirectUri = redirectUri;
    diagnostic.steps.push('REQUEST_PARSED');
    
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    diagnostic.credentials.clientId = !!clientId;
    diagnostic.credentials.clientSecret = !!clientSecret;
    diagnostic.steps.push('ENV_CHECKED');

    console.log('🔧 SPOTIFY API DIAGNOSTIC:', JSON.stringify(diagnostic, null, 2));

    if (!clientId || !clientSecret) {
      diagnostic.steps.push('MISSING_CREDENTIALS');
      console.log('❌ SPOTIFY API FAILED:', JSON.stringify(diagnostic, null, 2));
      return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
    }

    diagnostic.steps.push('SPOTIFY_REQUEST_START');
    
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

    diagnostic.spotifyResponse = {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
      headers: Object.fromEntries(tokenResponse.headers.entries())
    };
    diagnostic.steps.push(`SPOTIFY_RESPONSE_${tokenResponse.status}`);

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      diagnostic.steps.push('SPOTIFY_ERROR');
      diagnostic.spotifyError = error;
      console.log('❌ SPOTIFY API FAILED:', JSON.stringify(diagnostic, null, 2));
      return NextResponse.json({ error: 'Failed to exchange code for token', details: error }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    diagnostic.tokenData = {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    };
    diagnostic.steps.push('TOKEN_SUCCESS');
    
    console.log('✅ SPOTIFY API SUCCESS:', JSON.stringify(diagnostic, null, 2));
    
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      expires_at: Date.now() + (tokenData.expires_in * 1000), // Add expiration timestamp
    });

  } catch (error) {
    diagnostic.steps.push('EXCEPTION');
    diagnostic.exception = error.message;
    console.log('❌ SPOTIFY API EXCEPTION:', JSON.stringify(diagnostic, null, 2));
    return NextResponse.json({ error: 'Authentication failed', details: error.message }, { status: 500 });
  }
}