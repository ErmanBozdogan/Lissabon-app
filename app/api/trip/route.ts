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
    return NextResponse.json(tripData);
  } catch (error) {
    console.error('Error getting trip data:', error);
    return NextResponse.json(
      { error: 'Failed to get trip data' },
      { status: 500 }
    );
  }
}
