import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { TripData } from '@/types';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const TRIP_KEY = 'trip:default';

const getDanishWeekday = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const danishWeekdays = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  return danishWeekdays[dayOfWeek];
};

const getDefaultTripData = (): TripData => {
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
    inviteToken: uuidv4(),
  };
};

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Load trip data from KV
    const tripData = await kv.get<TripData>(TRIP_KEY);
    
    // If no trip data exists, initialize with default and save to KV
    if (!tripData) {
      const defaultTrip = getDefaultTripData();
      await kv.set(TRIP_KEY, defaultTrip);
      return NextResponse.json(defaultTrip, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json(tripData, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error getting trip data:', error);
    return NextResponse.json(
      { error: 'Failed to get trip data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { activities } = await request.json();

    if (!Array.isArray(activities)) {
      return NextResponse.json(
        { error: 'Activities must be an array' },
        { status: 400 }
      );
    }

    // Load current trip data
    const tripData = await kv.get<TripData>(TRIP_KEY) || getDefaultTripData();
    
    // Update activities
    tripData.activities = activities;
    
    // Save back to KV
    await kv.set(TRIP_KEY, tripData);

    return NextResponse.json(tripData, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error saving trip data:', error);
    return NextResponse.json(
      { error: 'Failed to save trip data' },
      { status: 500 }
    );
  }
}
