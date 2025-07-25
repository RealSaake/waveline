# Waveline Deployment Guide

## Deploy to Vercel

### 1. Prepare for Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from the waveline directory
cd waveline
vercel
```

### 2. Set Environment Variables in Vercel

After deployment, go to your Vercel dashboard and add these environment variables:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Update Spotify App Settings

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click on your "Waveline" app
3. Click "Edit Settings"
4. Add these Redirect URIs:
   ```
   http://localhost:3001/callback
   https://your-vercel-url.vercel.app/callback
   ```
5. Save changes

### 4. Update Redirect URI for Production

After deployment, update the SpotifyAuth component to use the production URL:

```typescript
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://your-vercel-url.vercel.app/callback'
  : 'http://localhost:3001/callback';
```

## Quick Deploy Commands

```bash
# Deploy to Vercel
vercel --prod

# Set environment variables
vercel env add SPOTIFY_CLIENT_ID
vercel env add SPOTIFY_CLIENT_SECRET
vercel env add NEXT_PUBLIC_SPOTIFY_CLIENT_ID
```

## Features After Deployment

✅ Real-time Spotify connection
✅ Live music visualization
✅ Full-screen mode
✅ Tempo-synced animations
✅ Dynamic color changes
✅ Mobile responsive
✅ Shareable URL