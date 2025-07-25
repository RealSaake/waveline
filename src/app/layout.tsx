import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waveline - Visual Music Moodboard Generator",
  description: "Transform your Spotify playlists into beautiful visual moodboards with album art, color palettes, and audio features.",
  keywords: "spotify, playlist, moodboard, music, visualization, album art",
  authors: [{ name: "Waveline" }],
  openGraph: {
    title: "Waveline - Visual Music Moodboard Generator",
    description: "Transform your Spotify playlists into beautiful visual moodboards",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent ethereum property conflicts from browser extensions
              (function() {
                if (typeof window !== 'undefined') {
                  // Store original ethereum if it exists
                  const originalEthereum = window.ethereum;
                  
                  // Override Object.defineProperty for ethereum specifically
                  const originalDefineProperty = Object.defineProperty;
                  Object.defineProperty = function(obj, prop, descriptor) {
                    if (obj === window && prop === 'ethereum') {
                      // Silently ignore ethereum redefinition attempts
                      return obj;
                    }
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                  };
                  
                  // Also prevent direct assignment errors
                  try {
                    Object.defineProperty(window, 'ethereum', {
                      get: function() { return originalEthereum; },
                      set: function(value) { return value; },
                      configurable: true,
                      enumerable: true
                    });
                  } catch (e) {
                    // Ignore if we can't override
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
