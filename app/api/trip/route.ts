import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { TripData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Stateless trip data endpoint for Vercel serverless
 * 
 * Returns a static trip object with:
 * - Trip name and dates
 * - Day structure
 * - Empty activities and users arrays
 * 
 * IMPORTANT:
 * - Do NOT use getTripData() or any filesystem operations
 * - Do NOT rely on persisted users or activities
 * - This is a temporary stateless fix for Vercel compatibility
 * - Persistence can be added later (e.g., database)
 */
const getStaticTripData = (): TripData => {
  return {
    tripName: 'Lisbon Trip',
    startDate: '2025-02-11',
    endDate: '2025-02-15',
    days: [
      { date: '2025-02-11', label: 'Onsdag, 11. februar' },
      { date: '2025-02-12', label: 'Torsdag, 12. februar' },
      { date: '2025-02-13', label: 'Fredag, 13. februar' },
      { date: '2025-02-14', label: 'Lørdag, 14. februar' },
      { date: '2025-02-15', label: 'Søndag, 15. februar' },
    ],
    activities: [],
    users: [],
    inviteToken: uuidv4(), // Generate a token for compatibility, but not used in password auth
  };
};

export async function GET(request: NextRequest) {
  try {
    // Stateless auth check - only verifies token presence
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Return static trip data (no filesystem operations)
    const tripData = getStaticTripData();
    return NextResponse.json(tripData);
  } catch (error) {
    console.error('Error getting trip data:', error);
    // Always return valid JSON, even on error
    return NextResponse.json(
      { error: 'Failed to get trip data' },
      { status: 500 }
    );
  }
}
