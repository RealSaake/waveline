// Enhanced audio analysis using multiple data sources

interface TrackAnalysis {
  id: string;
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  speechiness?: number;
  source: 'spotify' | 'lastfm' | 'musicbrainz' | 'generated';
}

// Generate intelligent audio features based on track metadata
export function generateIntelligentAudioFeatures(track: { id: string; name: string; artists: { name: string }[]; album: { name: string; release_date: string } }): TrackAnalysis {
  const trackName = track.name.toLowerCase();
  const artistName = track.artists[0]?.name.toLowerCase() || '';
  const albumName = track.album.name.toLowerCase();
  const releaseYear = new Date(track.album.release_date).getFullYear();
  
  // Genre/style detection based on artist and track names
  let energy = 0.5;
  let valence = 0.5;
  let tempo = 120;
  let danceability = 0.5;
  
  // Electronic/EDM indicators
  if (artistName.includes('deadmau5') || artistName.includes('skrillex') || 
      trackName.includes('remix') || trackName.includes('mix')) {
    energy += 0.3;
    danceability += 0.3;
    tempo += 20;
  }
  
  // Pop indicators
  if (artistName.includes('taylor') || artistName.includes('ariana') || 
      trackName.includes('love') || trackName.includes('baby')) {
    valence += 0.2;
    danceability += 0.2;
  }
  
  // Rock/Metal indicators
  if (trackName.includes('rock') || trackName.includes('metal') || 
      artistName.includes('metallica') || trackName.includes('fire')) {
    energy += 0.4;
    tempo += 30;
    valence -= 0.1;
  }
  
  // Sad/Emotional indicators
  if (trackName.includes('sad') || trackName.includes('cry') || 
      trackName.includes('alone') || trackName.includes('hurt')) {
    valence -= 0.3;
    energy -= 0.2;
    tempo -= 20;
  }
  
  // Happy indicators
  if (trackName.includes('happy') || trackName.includes('joy') || 
      trackName.includes('dance') || trackName.includes('party')) {
    valence += 0.3;
    energy += 0.2;
    danceability += 0.3;
  }
  
  // Chill/Ambient indicators
  if (trackName.includes('chill') || trackName.includes('ambient') || 
      trackName.includes('relax') || artistName.includes('lofi')) {
    energy -= 0.3;
    tempo -= 30;
    valence += 0.1;
  }
  
  // Year-based adjustments
  if (releaseYear < 1980) {
    tempo -= 10;
    energy -= 0.1;
  } else if (releaseYear > 2010) {
    energy += 0.1;
    danceability += 0.1;
  }
  
  // Normalize values
  energy = Math.max(0.1, Math.min(0.9, energy));
  valence = Math.max(0.1, Math.min(0.9, valence));
  tempo = Math.max(60, Math.min(180, tempo));
  danceability = Math.max(0.1, Math.min(0.9, danceability));
  
  return {
    id: track.id,
    energy,
    valence,
    tempo,
    danceability,
    source: 'generated'
  };
}

// Try to get audio features from Last.fm API (free alternative)
export async function getLastFmTrackInfo(artist: string, track: string): Promise<Partial<TrackAnalysis> | null> {
  try {
    // This would require a Last.fm API key
    // For now, return null to fall back to generated features
    return null;
  } catch (error) {
    console.warn('Last.fm API failed:', error);
    return null;
  }
}

// Enhanced audio analysis that combines multiple sources
export async function getEnhancedAudioFeatures(tracks: { id: string; name: string; artists: { name: string }[]; album: { name: string; release_date: string } }[]): Promise<TrackAnalysis[]> {
  const results: TrackAnalysis[] = [];
  
  for (const track of tracks) {
    // Try Last.fm first
    const lastFmData = await getLastFmTrackInfo(
      track.artists[0]?.name || '', 
      track.name
    );
    
    if (lastFmData) {
      results.push({
        id: track.id,
        energy: lastFmData.energy || 0.5,
        valence: lastFmData.valence || 0.5,
        tempo: lastFmData.tempo || 120,
        danceability: lastFmData.danceability || 0.5,
        source: 'lastfm'
      });
    } else {
      // Fall back to intelligent generation
      results.push(generateIntelligentAudioFeatures(track));
    }
  }
  
  return results;
}