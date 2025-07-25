import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = 'AIzaSyAsdKynMaoqQxkfIRC8NeipdBJg37x7TH0';

export async function POST(request: NextRequest) {
  try {
    const { trackName, artists, album } = await request.json();

    const prompt = `You are a music expert. Analyze this song and provide ONLY a JSON response with accurate data:

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
  "description": "[2-3 words describing the vibe like 'Dark electronic beats' or 'Uplifting pop anthem']"
}

Be specific and accurate. No generic responses.`;

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
      description: trackInfo.description || 'A great track'
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
      description: 'A great track with good vibes'
    });
  }
}