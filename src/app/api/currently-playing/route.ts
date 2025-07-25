import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Validate token format
    if (!accessToken || accessToken.length < 10) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }

    // Get currently playing track
    const currentlyPlayingResponse = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Handle no content (nothing playing)
    if (currentlyPlayingResponse.status === 204) {
      return NextResponse.json({ isPlaying: false, track: null });
    }

    // Handle token expiration
    if (currentlyPlayingResponse.status === 401) {
      return NextResponse.json({ error: 'Token expired', tokenExpired: true }, { status: 401 });
    }

    if (!currentlyPlayingResponse.ok) {
      const error = await currentlyPlayingResponse.text();
      console.error('Currently playing API error:', currentlyPlayingResponse.status, error);
      return NextResponse.json({ 
        error: 'Failed to get currently playing', 
        status: currentlyPlayingResponse.status,
        details: error 
      }, { status: currentlyPlayingResponse.status });
    }

    const currentlyPlaying = await currentlyPlayingResponse.json();
    
    if (!currentlyPlaying.item) {
      return NextResponse.json({ isPlaying: false, track: null });
    }

    // Get audio features for the current track
    let audioFeatures = null;
    try {
      console.log('Fetching audio features for track:', currentlyPlaying.item.id);
      const audioFeaturesResponse = await fetch(
        `https://api.spotify.com/v1/audio-features/${currentlyPlaying.item.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      console.log('Audio features response status:', audioFeaturesResponse.status);
      
      if (audioFeaturesResponse.ok) {
        audioFeatures = await audioFeaturesResponse.json();
        console.log('Audio features received:', audioFeatures);
      } else {
        const errorText = await audioFeaturesResponse.text();
        console.error('Audio features error:', audioFeaturesResponse.status, errorText);
      }
    } catch (error) {
      console.error('Failed to get audio features:', error);
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
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Currently playing error:', error);
    return NextResponse.json({ error: 'Failed to get currently playing' }, { status: 500 });
  }
}