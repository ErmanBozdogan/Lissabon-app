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
const getDanishWeekday = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const danishWeekdays = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  return danishWeekdays[dayOfWeek];
};

const getStaticTripData = (): TripData => {
  const dates = ['2025-02-11', '2025-02-12', '2025-02-13', '2025-02-14', '2025-02-15'];
  const danishMonths = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
  
  return {
    tripName: 'Lisbon Trip',
    startDate: '2025-02-11',
    endDate: '2025-02-15',
    days: dates.map(dateString => {
      const date = new Date(dateString + 'T00:00:00');
      const day = date.getDate();
      const month = danishMonths[date.getMonth()];
      const weekday = getDanishWeekday(dateString);
      return {
        date: dateString,
        label: `${weekday}, ${day}. ${month}`
      };
    }),
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
