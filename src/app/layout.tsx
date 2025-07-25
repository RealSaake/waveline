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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
