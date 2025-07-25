import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { trackName, artists, album } = await request.json();

    const prompt = `You are a music expert and visual artist. Analyze this song and provide ONLY a JSON response with accurate data including a unique visual DNA:

Song: "${trackName}" by ${artists}
Album: ${album}

Return ONLY this JSON format (no other text):
{
  "energy": [0.0-1.0 based on intensity/power],
  "valence": [0.0-1.0 based on positivity/happiness],
  "tempo": [actual BPM estimate],
  "danceability": [0.0-1.0 based on rhythm/beat],
  "genre": "[specific genre like 'Pop', 'Hip-Hop', 'Rock', etc.]",
  "mood": "[one word: 'Energetic', 'Melancholic', 'Upbeat', 'Chill', etc.]",
  "description": "[2-3 words describing the vibe like 'Dark electronic beats' or 'Uplifting pop anthem']",
  "visualDNA": {
    "primaryColor": "[hex color that matches the song's energy, like '#ff6b6b' for energetic or '#4ecdc4' for chill]",
    "secondaryColor": "[complementary hex color]",
    "accentColor": "[vibrant accent hex color]",
    "particleShape": "[circle, triangle, square, star, or hexagon based on genre/mood]",
    "particleSpeed": [0.1-2.0 based on tempo and energy],
    "particleSize": [0.5-3.0 based on intensity],
    "flowPattern": "[radial, spiral, wave, explosion, or organic based on song structure]",
    "complexity": [1-10 based on musical complexity],
    "brightness": [0.3-1.0 based on valence and energy]
  }
}

Be specific and accurate. Create a unique visual identity for this exact song.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini');
    }

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const trackInfo = JSON.parse(jsonMatch[0]);
    
    // Validate and sanitize the response
    const sanitizedInfo = {
      energy: Math.max(0, Math.min(1, trackInfo.energy || 0.7)),
      valence: Math.max(0, Math.min(1, trackInfo.valence || 0.6)),
      tempo: Math.max(60, Math.min(200, trackInfo.tempo || 120)),
      danceability: Math.max(0, Math.min(1, trackInfo.danceability || 0.7)),
      genre: trackInfo.genre || 'Unknown',
      mood: trackInfo.mood || 'Energetic',
      description: trackInfo.description || 'A great track',
      visualDNA: {
        primaryColor: trackInfo.visualDNA?.primaryColor || '#6366f1',
        secondaryColor: trackInfo.visualDNA?.secondaryColor || '#8b5cf6',
        accentColor: trackInfo.visualDNA?.accentColor || '#f59e0b',
        particleShape: trackInfo.visualDNA?.particleShape || 'circle',
        particleSpeed: Math.max(0.1, Math.min(2.0, trackInfo.visualDNA?.particleSpeed || 1.0)),
        particleSize: Math.max(0.5, Math.min(3.0, trackInfo.visualDNA?.particleSize || 1.5)),
        flowPattern: trackInfo.visualDNA?.flowPattern || 'radial',
        complexity: Math.max(1, Math.min(10, trackInfo.visualDNA?.complexity || 5)),
        brightness: Math.max(0.3, Math.min(1.0, trackInfo.visualDNA?.brightness || 0.8))
      }
    };

    return NextResponse.json(sanitizedInfo);

  } catch (error) {
    console.error('Track info error:', error);
    
    // Return sensible defaults if AI fails
    return NextResponse.json({
      energy: 0.7,
      valence: 0.6,
      tempo: 120,
      danceability: 0.7,
      genre: 'Unknown',
      mood: 'Energetic',
      description: 'A great track with good vibes',
      visualDNA: {
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        accentColor: '#f59e0b',
        particleShape: 'circle',
        particleSpeed: 1.0,
        particleSize: 1.5,
        flowPattern: 'radial',
        complexity: 5,
        brightness: 0.8
      }
    });
  }
}