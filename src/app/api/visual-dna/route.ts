import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { trackName, artists, album, audioFeatures } = await request.json();

    // Generate visual DNA based on track characteristics
    const visualDNA = {
      primaryColor: generateColorFromTrack(trackName, artists),
      secondaryColor: generateColorFromFeatures(audioFeatures?.energy || 0.5),
      accentColor: generateColorFromFeatures(audioFeatures?.valence || 0.5),
      particleShape: getParticleShape(audioFeatures?.danceability || 0.5),
      particleSpeed: Math.max(0.1, Math.min(2.0, (audioFeatures?.tempo || 120) / 120)),
      particleSize: Math.max(0.5, Math.min(2.0, (audioFeatures?.energy || 0.5) * 2)),
      flowPattern: getFlowPattern(audioFeatures?.valence || 0.5),
      complexity: Math.max(0.1, Math.min(1.0, (audioFeatures?.energy || 0.5) + (audioFeatures?.danceability || 0.5)) / 2),
      brightness: Math.max(0.3, Math.min(1.0, (audioFeatures?.valence || 0.5) + 0.3))
    };

    return NextResponse.json({ visualDNA });
  } catch (error) {
    console.error('Visual DNA generation error:', error);
    return NextResponse.json({ error: 'Failed to generate visual DNA' }, { status: 500 });
  }
}

function generateColorFromTrack(trackName: string, artists: string): string {
  const combined = `${trackName}${artists}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

function generateColorFromFeatures(value: number): string {
  const hue = Math.floor(value * 360);
  const saturation = 60 + Math.floor(value * 30);
  const lightness = 50 + Math.floor(value * 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getParticleShape(danceability: number): string {
  if (danceability > 0.8) return 'star';
  if (danceability > 0.6) return 'hexagon';
  if (danceability > 0.4) return 'triangle';
  if (danceability > 0.2) return 'square';
  return 'circle';
}

function getFlowPattern(valence: number): string {
  if (valence > 0.7) return 'spiral';
  if (valence > 0.5) return 'wave';
  if (valence > 0.3) return 'linear';
  return 'chaotic';
}