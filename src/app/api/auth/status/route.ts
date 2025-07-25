import { NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/auth';

export async function GET() {
  try {
    const tokens = await getAuthCookie();
    
    if (!tokens) {
      return NextResponse.json({ authenticated: false });
    }

    // Check if token is expired
    const isExpired = Date.now() >= tokens.expires_at;
    
    return NextResponse.json({ 
      authenticated: !isExpired,
      expires_at: tokens.expires_at 
    });

  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json({ authenticated: false });
  }
}