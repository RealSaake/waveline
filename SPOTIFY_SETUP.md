# Spotify API Setup Guide

To use Waveline, you need to set up Spotify API credentials. Follow these steps:

## Step 1: Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the details:
   - **App Name**: Waveline (or any name you prefer)
   - **App Description**: Visual Music Moodboard Generator
   - **Website**: http://localhost:3000 (for development)
   - **Redirect URI**: Not needed for this app
5. Check the boxes for Terms of Service and Branding Guidelines
6. Click "Save"

## Step 2: Get Your Credentials

1. In your newly created app dashboard, you'll see:
   - **Client ID**: Copy this value
   - **Client Secret**: Click "View client secret" and copy this value

## Step 3: Update Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values:

```env
SPOTIFY_CLIENT_ID=your_actual_client_id_here
SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here
```

## Step 4: Test the Application

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Try with a sample playlist URL:
   ```
   https://open.spotify.com/playlist/37i9dQZF1DXcBWFJp2gaKH
   ```

## Important Notes

- **Public Playlists Only**: The app can only access public Spotify playlists
- **No User Authentication**: This app uses Client Credentials flow, so no user login required
- **Rate Limits**: Spotify API has rate limits, so avoid making too many requests quickly
- **CORS**: The API calls are made from the server-side, so no CORS issues

## Troubleshooting

### "Failed to get Spotify token" Error
- Double-check your Client ID and Client Secret
- Make sure there are no extra spaces in your .env.local file
- Restart the development server after updating environment variables

### "Invalid Spotify playlist URL" Error
- Make sure the URL is a public playlist
- URL format should be: `https://open.spotify.com/playlist/[playlist_id]`

### "Failed to fetch playlist data" Error
- The playlist might be private
- The playlist ID might be invalid
- Check your internet connection

## Sample Playlist URLs for Testing

- **Top 50 Global**: `https://open.spotify.com/playlist/37i9dQZF1DXcBWFJp2gaKH`
- **Today's Top Hits**: `https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd`
- **Chill Hits**: `https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6`
- **Pop Rising**: `https://open.spotify.com/playlist/37i9dQZF1DWUa8ZRTfalHk`