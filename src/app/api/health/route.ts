import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    spotify: {
      clientId: !!process.env.SPOTIFY_CLIENT_ID,
      clientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    }
  });
}