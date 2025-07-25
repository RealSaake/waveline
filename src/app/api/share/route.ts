import { NextRequest, NextResponse } from 'next/server';

interface ShareData {
  trackName: string;
  artists: string;
  album: string;
  visualMode: string;
  visualDNA: any;
  timestamp: number;
}

// In-memory storage for demo (use database in production)
const sharedVisualizations = new Map<string, ShareData>();

export async function POST(request: NextRequest) {
  try {
    const shareData: ShareData = await request.json();
    
    // Generate unique share ID
    const shareId = generateShareId();
    
    // Store the visualization data
    sharedVisualizations.set(shareId, {
      ...shareData,
      timestamp: Date.now()
    });
    
    // Clean up old shares (older than 30 days)
    cleanupOldShares();
    
    const shareUrl = `${request.nextUrl.origin}/share/${shareId}`;
    
    return NextResponse.json({
      shareId,
      shareUrl,
      success: true
    });
    
  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('id');
  
  if (!shareId) {
    return NextResponse.json(
      { error: 'Share ID required' },
      { status: 400 }
    );
  }
  
  const shareData = sharedVisualizations.get(shareId);
  
  if (!shareData) {
    return NextResponse.json(
      { error: 'Share not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(shareData);
}

function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function cleanupOldShares() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  for (const [shareId, data] of sharedVisualizations.entries()) {
    if (data.timestamp < thirtyDaysAgo) {
      sharedVisualizations.delete(shareId);
    }
  }
}