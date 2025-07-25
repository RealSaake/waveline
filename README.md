# Waveline - Visual Music Moodboard Generator

Transform your Spotify playlists into beautiful visual moodboards with album art, dominant color palettes, and audio features like energy, tempo, and valence.

## Features

- **Spotify Playlist Input**: Paste any public Spotify playlist URL
- **Visual Moodboard Generation**: Beautiful track tiles with:
  - Album cover art
  - Dominant color extraction
  - Valence mood bars
  - Energy and tempo indicators
- **Responsive Design**: Mobile-first layout that works on all devices
- **Dynamic Backgrounds**: Background gradients that adapt to playlist mood
- **Export Options**: Export moodboards as PNG (coming soon)

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **API**: Spotify Web API
- **Deployment**: Vercel-ready

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd waveline
npm install
```

### 2. Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy your Client ID and Client Secret
4. Update `.env.local`:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Enter Playlist URL**: Paste a public Spotify playlist URL
2. **Generate Moodboard**: Click "Generate Moodboard" to fetch playlist data
3. **Explore**: Scroll through the visual moodboard with track cards
4. **Export**: Use the export button to save as PNG (feature coming soon)

### Sample Playlist URLs to Try

- Top 50 Global: `https://open.spotify.com/playlist/37i9dQZF1DXcBWFJp2gaKH`
- Today's Top Hits: `https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd`

## Project Structure

```
waveline/
├── src/
│   ├── app/
│   │   ├── api/playlist/route.ts    # Spotify API integration
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Main page
│   └── components/
│       ├── Moodboard.tsx            # Moodboard grid component
│       ├── PlaylistInput.tsx        # URL input form
│       └── TrackCard.tsx            # Individual track cards
├── public/                          # Static assets
└── README.md
```

## API Endpoints

### POST /api/playlist

Fetches playlist data and audio features from Spotify.

**Request Body:**
```json
{
  "playlistUrl": "https://open.spotify.com/playlist/..."
}
```

**Response:**
```json
{
  "name": "Playlist Name",
  "description": "Playlist description",
  "tracks": [...],
  "audioFeatures": [...]
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

```env
SPOTIFY_CLIENT_ID=your_production_client_id
SPOTIFY_CLIENT_SECRET=your_production_client_secret
```

## Roadmap

- [x] Basic playlist input and moodboard generation
- [x] Dominant color extraction from album art
- [x] Audio features visualization (valence, energy, tempo)
- [x] Responsive design
- [ ] PNG export functionality
- [ ] Shareable moodboard links
- [ ] Light/dark mode toggle
- [ ] Advanced audio feature visualizations
- [ ] User authentication and saved moodboards
- [ ] Playlist mood analysis and insights

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.