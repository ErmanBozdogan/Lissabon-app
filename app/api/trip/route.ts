import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { TripData } from '@/types';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const TRIP_KEY = 'trip:default';

const getEnglishWeekday = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const englishWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return englishWeekdays[dayOfWeek];
};

const getDefaultTripData = (): TripData => {
  const dates = ['2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14', '2026-02-15'];
  const danishMonths = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
  
  return {
    tripName: 'Lisbon Trip',
    startDate: '2026-02-11',
    endDate: '2026-02-15',
    days: dates.map(dateString => {
      const date = new Date(dateString + 'T00:00:00');
      const day = date.getDate();
      const month = danishMonths[date.getMonth()];
      const weekday = getEnglishWeekday(dateString);
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
    let tripData = await kv.get<TripData>(TRIP_KEY);
    
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

    // Check if trip data has Danish weekdays or wrong year (2025 instead of 2026)
    const hasDanishWeekday = tripData.days.some(day => 
      day.label.includes('Mandag') || 
      day.label.includes('Tirsdag') || 
      day.label.includes('Onsdag') ||
      day.label.includes('Torsdag') ||
      day.label.includes('Fredag') ||
      day.label.includes('Lørdag') ||
      day.label.includes('Søndag')
    );

    const hasWrongYear = tripData.startDate?.startsWith('2025') || tripData.days.some(day => day.date.startsWith('2025'));

    if (hasDanishWeekday || hasWrongYear) {
      // Regenerate days with English weekdays and correct year (2026), preserving activities
      const defaultTrip = getDefaultTripData();
      tripData.days = defaultTrip.days;
      tripData.startDate = defaultTrip.startDate;
      tripData.endDate = defaultTrip.endDate;
      // Preserve activities and other data
      await kv.set(TRIP_KEY, tripData);
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
