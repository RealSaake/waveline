import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedAudioFeatures } from '@/lib/audioAnalysis';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  preview_url: string | null;
}

interface SpotifyAudioFeatures {
  id: string;
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
}

interface PlaylistData {
  name: string;
  description: string;
  tracks: SpotifyTrack[];
  audioFeatures: SpotifyAudioFeatures[];
}

async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify token');
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchPlaylistData(playlistId: string, token: string): Promise<PlaylistData> {
  // Fetch playlist info and tracks
  const playlistResponse = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,tracks.items(track(id,name,artists,album,preview_url))`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!playlistResponse.ok) {
    const errorText = await playlistResponse.text();
    console.error('Spotify API Error:', playlistResponse.status, errorText);
    
    // Provide more helpful error message
    if (playlistResponse.status === 404) {
      throw new Error('Playlist not found. Make sure the playlist is public and the URL is correct. Note: Some Spotify curated playlists may not be accessible via API.');
    } else if (playlistResponse.status === 403) {
      throw new Error('Access denied. The playlist might be private or require user authentication.');
    } else {
      throw new Error(`Failed to fetch playlist data: ${playlistResponse.status} - ${errorText}`);
    }
  }

  const playlistData = await playlistResponse.json();
  const tracks: SpotifyTrack[] = playlistData.tracks.items
    .map((item: { track: SpotifyTrack }) => item.track)
    .filter((track: SpotifyTrack) => track && track.id);

  // Fetch audio features for all tracks
  let audioFeatures: SpotifyAudioFeatures[] = [];
  
  if (tracks.length > 0) {
    try {
      // Try fetching audio features in smaller batches
      const batchSize = 50; // Spotify allows up to 100, but let's be conservative
      const trackBatches = [];
      
      for (let i = 0; i < tracks.length; i += batchSize) {
        trackBatches.push(tracks.slice(i, i + batchSize));
      }
      
      for (const batch of trackBatches) {
        const trackIds = batch.map(track => track.id).join(',');
        const audioFeaturesResponse = await fetch(
          `https://api.spotify.com/v1/audio-features?ids=${trackIds}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (audioFeaturesResponse.ok) {
          const audioFeaturesData = await audioFeaturesResponse.json();
          const batchFeatures = audioFeaturesData.audio_features?.filter((feature: SpotifyAudioFeatures) => feature) || [];
          audioFeatures.push(...batchFeatures);
        } else {
          console.warn(`Audio features batch failed: ${audioFeaturesResponse.status}`);
          // Use enhanced audio analysis as fallback
          const enhancedFeatures = await getEnhancedAudioFeatures(batch);
          audioFeatures.push(...enhancedFeatures);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch audio features, using enhanced analysis:', error);
      // Use enhanced audio analysis as fallback
      audioFeatures = await getEnhancedAudioFeatures(tracks);
    }
  }

  return {
    name: playlistData.name,
    description: playlistData.description,
    tracks,
    audioFeatures,
  };
}

function extractPlaylistId(url: string): string {
  // Handle different URL formats
  const patterns = [
    /playlist\/([a-zA-Z0-9]+)/,  // Standard format
    /playlist\/([a-zA-Z0-9]+)\?/,  // With query params
    /playlist\/([a-zA-Z0-9]+)$/,   // End of string
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  throw new Error(`Invalid Spotify playlist URL format: ${url}`);
}

export async function POST(request: NextRequest) {
  try {
    const { playlistUrl } = await request.json();

    if (!playlistUrl) {
      return NextResponse.json(
        { error: 'Playlist URL is required' },
        { status: 400 }
      );
    }

    console.log('Processing playlist URL:', playlistUrl);
    const playlistId = extractPlaylistId(playlistUrl);
    console.log('Extracted playlist ID:', playlistId);
    
    const token = await getSpotifyToken();
    console.log('Got Spotify token successfully');
    
    const playlistData = await fetchPlaylistData(playlistId, token);

    return NextResponse.json(playlistData);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}