import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-key-change-in-production'
);

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function encryptTokens(tokens: SpotifyTokens): Promise<string> {
  return await new SignJWT(tokens as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function decryptTokens(encryptedTokens: string): Promise<SpotifyTokens | null> {
  try {
    const { payload } = await jwtVerify(encryptedTokens, JWT_SECRET);
    return payload as unknown as SpotifyTokens;
  } catch {
    return null;
  }
}

export async function setAuthCookie(tokens: SpotifyTokens) {
  const encryptedTokens = await encryptTokens(tokens);
  const cookieStore = await cookies();
  
  cookieStore.set('spotify-auth', encryptedTokens, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

export async function getAuthCookie(): Promise<SpotifyTokens | null> {
  const cookieStore = await cookies();
  const encryptedTokens = cookieStore.get('spotify-auth')?.value;
  
  if (!encryptedTokens) {
    return null;
  }
  
  return await decryptTokens(encryptedTokens);
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('spotify-auth');
}

export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokens | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Keep old refresh token if new one not provided
      expires_at: Date.now() + (data.expires_in * 1000),
    };
  } catch {
    return null;
  }
}