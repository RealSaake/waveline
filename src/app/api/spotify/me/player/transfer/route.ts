import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { device_ids, play = true } = body;

    if (!device_ids || !Array.isArray(device_ids) || device_ids.length === 0) {
      return NextResponse.json({ error: 'device_ids array is required' }, { status: 400 });
    }

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
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