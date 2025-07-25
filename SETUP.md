# 🚀 Setup Guide

Get your Spotify Visualizer running in 5 minutes!

## Prerequisites

- **Spotify Premium Account** (required for real-time audio analysis)
- **Node.js 18+** installed
- **Modern Browser** (Chrome, Firefox, Safari, Edge)

## 1. Clone & Install

```bash
git clone https://github.com/RealSaake/waveline
cd waveline
npm install
```

## 2. Spotify App Setup

### Create Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in and click **"Create App"**
3. Fill in:
   - **App Name**: `Spotify Visualizer`
   - **App Description**: `Real-time music visualization app`
   - **Website**: `http://localhost:3000`
   - **Redirect URIs**: `http://localhost:3000/callback`
4. Save and note your **Client ID** and **Client Secret**

### Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

## 3. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect your Spotify account!

## 🎵 Getting Real Audio Analysis

For the best experience with real-time audio visualization:

1. **Use Spotify Premium** - Required for Web Playback SDK
2. **Play through the web app** - Not your Spotify desktop/mobile app
3. **Allow audio permissions** - When prompted by your browser
4. **Use supported browser** - Chrome recommended for best performance

## 🔧 Production Deployment

### Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/RealSaake/waveline)

1. **Connect GitHub** - Link your forked repo to Vercel
2. **Environment Variables** - Add these in Vercel dashboard:
   ```
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your_random_secret_here
   ```
3. **Update Spotify App** - In Spotify Developer Dashboard:
   - Website: `https://your-app.vercel.app`
   - Redirect URIs: `https://your-app.vercel.app/callback`
4. **Deploy** - Vercel will auto-deploy on push!

### Live Example
🎵 **[waveline.vercel.app](https://waveline.vercel.app)** - See it in action!

### Other Platforms
Works on any platform supporting Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 🐛 Troubleshooting

### "Simulated Audio" Instead of Real Audio
- Ensure you have Spotify Premium
- Try refreshing the page
- Check browser console for errors
- Make sure you're playing music through the web app

### Authentication Issues
- Verify Client ID/Secret are correct
- Check redirect URI matches exactly
- Clear browser cookies and try again

### Performance Issues
- Close other browser tabs
- Try Chrome for best performance
- Check if hardware acceleration is enabled

## 🎨 Customization

Want to add your own visualization? Check out:
- `src/components/MainVisualizer.tsx` - Main visualization component
- `src/hooks/useSpotifyPlayer.ts` - Audio analysis logic
- `src/components/GenerativeVisualizer.tsx` - AI-powered visuals

## 📞 Need Help?

- 🐛 [Report Issues](https://github.com/RealSaake/waveline/issues)
- 💬 [Discussions](https://github.com/RealSaake/waveline/discussions)
- 📧 Email: your-email@example.com

---

**Ready to visualize your music? Let's go! 🎵✨**