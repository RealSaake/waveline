# 🎵 Waveline - Music Visualization

Transform your Spotify music into stunning real-time visualizations. Connect your Spotify account and watch your favorite songs come alive with beautiful, responsive visual effects.

![Waveline Preview](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Waveline+Music+Visualizer)

## ✨ Features

### 🎨 **Beautiful Visualizations**
- **Particles** - Floating orbs that dance to your music
- **Waves** - Flowing wave patterns that pulse with the beat
- **Spiral** - Mesmerizing spiral galaxy effects
- **Pulse** - Central pulse with expanding rings
- **Bars** - Classic frequency bars with glow effects

### 🎵 **Smart Music Integration**
- **Spotify Web Playback SDK** - Direct audio streaming through your browser
- **Real-time Audio Features** - Energy, mood, tempo, and danceability
- **AI-Enhanced Track Info** - Genre, mood descriptions, and track analysis
- **Seamless Playback Control** - Play, pause, skip, and volume control

### 🚀 **User-Friendly Experience**
- **One-Click Setup** - Just connect your Spotify account
- **No Technical Knowledge Required** - Works out of the box
- **Responsive Design** - Beautiful on desktop and mobile
- **Smooth Animations** - 60fps visualizations with elegant transitions

## 🎯 Getting Started

1. **Visit** [waveline.vercel.app](https://waveline.vercel.app)
2. **Connect** your Spotify account
3. **Start playing** music on Spotify
4. **Enjoy** the visualizations!

## 🛠️ For Developers

### Prerequisites
- Node.js 18+
- Spotify Developer Account
- Vercel Account (for deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/RealSaake/waveline.git
cd waveline

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Spotify Client ID and Secret

# Run development server
npm run dev
```

### Environment Variables

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
```

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Audio**: Spotify Web Playback SDK
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 🎨 Visualization Modes

### Particles ✨
Floating orbs that respond to frequency data, creating a mesmerizing particle system that dances around the screen.

### Waves 🌊
Flowing wave patterns that pulse and move with the music's rhythm, creating an ocean-like effect.

### Spiral 🌀
A spiral galaxy visualization where particles follow curved paths, creating beautiful cosmic patterns.

### Pulse 💫
Central pulse visualization with expanding rings that react to bass and beat intensity.

### Bars 📊
Classic frequency bars with modern glow effects and smooth color transitions.

## 🔧 Features in Detail

### Real-time Audio Analysis
- Connects directly to Spotify's audio stream
- Analyzes frequency data in real-time
- Responds to bass, mids, and treble
- Beat detection and rhythm analysis

### Smart Track Information
- Fetches audio features from Spotify API
- Enhances with AI-generated insights
- Displays energy, mood, tempo, and genre
- Provides meaningful track descriptions

### Seamless Playback Control
- Full playback control within the visualizer
- Volume adjustment with visual feedback
- Track skipping and play/pause
- Progress tracking and display

## 🚀 Deployment

The app is automatically deployed to Vercel on every push to the main branch.

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy to Vercel
vercel --prod
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Spotify for their amazing Web Playback SDK
- Google for the Gemini AI API
- The open-source community for inspiration and tools

---

**Made with ❤️ by [RealSaake](https://github.com/RealSaake)**

*Transform your music into art with Waveline* 🎵✨

---

### 🔥 Latest Updates
- **Mind-blowing visualizations** with particles, waves, and cosmic effects
- **Real-time AI analysis** for accurate track information
- **Zero-lag audio processing** with Spotify Web Playback SDK