import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;
    const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    // Try to use the current access token
    const testResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (testResponse.ok) {
      // Token is still valid
      return NextResponse.json({ access_token: accessToken });
    }

    // Token expired, try to refresh
    if (!refreshToken) {
      return NextResponse.json({ error: 'Token expired and no refresh token available' }, { status: 401 });
    }

    const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!refreshResponse.ok) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
    }

    const refreshData = await refreshResponse.json();
    
    // Update the access token cookie
    const response = NextResponse.json({ access_token: refreshData.access_token });
    response.cookies.set('spotify_access_token', refreshData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
    });

    // Update refresh token if provided
    if (refreshData.refresh_token) {
      response.cookies.set('spotify_refresh_token', refreshData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;

  } catch (error) {
    console.error('Token endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}