import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { kv } from '@vercel/kv';
import { TripData, Activity } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const TRIP_KEY = 'trip:default';

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

    const { activityId, userName } = await request.json();

    if (!activityId || !userName) {
      return new Response(JSON.stringify({ error: 'Activity ID and user name are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Read the current trip from KV
    let tripData = await kv.get<TripData>(TRIP_KEY);
    if (!tripData) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Find the correct activity
    const activityIndex = tripData.activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Get the activity and ensure likes array exists
    const activity = { ...tripData.activities[activityIndex] };
    const currentLikes = activity.likes || [];

    // Toggle like: if user name is in likes, remove it; otherwise add it
    let updatedLikes: string[];
    if (currentLikes.includes(userName)) {
      // Remove user name from likes
      updatedLikes = currentLikes.filter(name => name !== userName);
    } else {
      // Add user name to likes
      updatedLikes = [...currentLikes, userName];
    }

    // Create updated activity with new likes array
    const updatedActivity: Activity = {
      ...activity,
      likes: updatedLikes,
    };

    // Update ONLY this activity in the activities array
    const updatedActivities = [...tripData.activities];
    updatedActivities[activityIndex] = updatedActivity;

    // Update trip data with new activities array
    const updatedTripData: TripData = {
      ...tripData,
      activities: updatedActivities,
    };

    // Save the updated trip back to KV
    await kv.set(TRIP_KEY, updatedTripData);

    // Return the updated activity
    return new Response(JSON.stringify({ activity: updatedActivity }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return new Response(JSON.stringify({ error: 'Failed to toggle like' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}
