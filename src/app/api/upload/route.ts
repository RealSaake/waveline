import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Handle file upload if needed
    const formData = await request.formData();
    
    // For now, just return success
    return NextResponse.json({ 
      success: true, 
      message: 'Upload endpoint available' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Upload endpoint is available',
    methods: ['POST']
  });
}