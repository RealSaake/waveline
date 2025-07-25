import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Get currently playing track
    const currentlyPlayingResponse = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (currentlyPlayingResponse.status === 204) {
      return NextResponse.json({ isPlaying: false, track: null });
    }

    if (!currentlyPlayingResponse.ok) {
      const error = await currentlyPlayingResponse.text();
      console.error('Currently playing API error:', error);
      return NextResponse.json({ error: 'Failed to get currently playing' }, { status: 400 });
    }

    const currentlyPlaying = await currentlyPlayingResponse.json();
    
    if (!currentlyPlaying.item) {
      return NextResponse.json({ isPlaying: false, track: null });
    }

    // Get audio features for the current track
    let audioFeatures = null;
    try {
      const audioFeaturesResponse = await fetch(
        `https://api.spotify.com/v1/audio-features/${currentlyPlaying.item.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (audioFeaturesResponse.ok) {
        audioFeatures = await audioFeaturesResponse.json();
      }
    } catch (error) {
      console.warn('Failed to get audio features:', error);
    }

    return NextResponse.json({
      isPlaying: currentlyPlaying.is_playing,
      track: {
        id: currentlyPlaying.item.id,
        name: currentlyPlaying.item.name,
        artists: currentlyPlaying.item.artists,
        album: currentlyPlaying.item.album,
        duration_ms: currentlyPlaying.item.duration_ms,
        progress_ms: currentlyPlaying.progress_ms,
        preview_url: currentlyPlaying.item.preview_url,
      },
      audioFeatures,
      device: currentlyPlaying.device,
    });

  } catch (error) {
    console.error('Currently playing error:', error);
    return NextResponse.json({ error: 'Failed to get currently playing' }, { status: 500 });
  }
}