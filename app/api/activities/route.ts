import { NextRequest } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { kv } from '@vercel/kv';
import { Activity, TripData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const TRIP_KEY = 'trip:default';

const getDefaultTripData = (): TripData => {
  const dates = ['2025-02-11', '2025-02-12', '2025-02-13', '2025-02-14', '2025-02-15'];
  const danishMonths = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
  
  const getEnglishWeekday = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const englishWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return englishWeekdays[dayOfWeek];
  };

  return {
    tripName: 'Lisbon Trip',
    startDate: '2025-02-11',
    endDate: '2025-02-15',
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
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const tripData = await kv.get<TripData>(TRIP_KEY);
    const activities = tripData?.activities || [];
    
    return new Response(JSON.stringify({ activities }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error getting activities:', error);
    return new Response(JSON.stringify({ error: 'Failed to get activities' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const { title, day, description, location, category, creatorName } = await request.json();

    if (!title || !day) {
      return new Response(JSON.stringify({ error: 'Title and day are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Load trip data from KV
    let tripData = await kv.get<TripData>(TRIP_KEY);
    if (!tripData) {
      tripData = getDefaultTripData();
    }

    // creatorName MUST be provided from client - never use 'User' as fallback
    if (!creatorName || creatorName === 'User') {
      return new Response(JSON.stringify({ error: 'Creator name is required and cannot be "User"' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }
    const activityCreatorName = creatorName;

    const newActivity: Activity = {
      id: `activity-${Date.now()}-${uuidv4()}`,
      title,
      description,
      location,
      day,
      creatorId: user.id,
      creatorName: activityCreatorName,
      createdAt: new Date().toISOString(),
      likes: [],
      category,
    };

    // Add new activity to trip
    tripData.activities = [...(tripData.activities || []), newActivity];
    
    // Save updated trip data to KV
    await kv.set(TRIP_KEY, tripData);

    return new Response(JSON.stringify({ activities: tripData.activities }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return new Response(JSON.stringify({ error: 'Failed to create activity' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}
