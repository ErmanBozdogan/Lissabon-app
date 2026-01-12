import { NextRequest } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { kv } from '@vercel/kv';
import { Activity } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const ACTIVITIES_KEY = 'trip:activities';

export async function GET(request: NextRequest) {
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

  const activities = await kv.get<Activity[]>(ACTIVITIES_KEY);
  return new Response(JSON.stringify({ activities: activities || [] }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: NextRequest) {
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

  const { title, day, description, location, category } = await request.json();

  if (!title || !day) {
    return new Response(JSON.stringify({ error: 'Title and day are required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  const existingActivities = await kv.get<Activity[]>(ACTIVITIES_KEY) || [];
  
  const newActivity: Activity = {
    id: `activity-${Date.now()}-${uuidv4()}`,
    title,
    description,
    location,
    day,
    creatorId: user.id,
    creatorName: user.name,
    createdAt: new Date().toISOString(),
    votes: [],
    category,
  };

  const updatedActivities = [...existingActivities, newActivity];
  await kv.set(ACTIVITIES_KEY, updatedActivities);

  return new Response(JSON.stringify({ activities: updatedActivities }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
