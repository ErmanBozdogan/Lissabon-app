import { NextRequest, NextResponse } from 'next/server';
import { getTripData } from '@/lib/data';
import { getCurrentUser as getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const tripData = getTripData();
    
    // Get base URL properly for server-side
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      // Try to get from request headers (works in production)
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 
                      (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      
      if (host) {
        baseUrl = `${protocol}://${host}`;
      } else {
        // Fallback to localhost for development
        baseUrl = 'http://localhost:3000';
      }
    }
    
    const inviteUrl = `${baseUrl}/join?token=${tripData.inviteToken}`;

    return NextResponse.json({ inviteUrl, inviteToken: tripData.inviteToken });
  } catch (error) {
    console.error('Error getting invite link:', error);
    return NextResponse.json(
      { error: 'Failed to get invite link' },
      { status: 500 }
    );
  }
}
