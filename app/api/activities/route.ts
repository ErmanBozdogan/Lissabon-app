import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { kv } from '@vercel/kv';
import { Activity } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const ACTIVITIES_KEY = 'trip:activities';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const activities = await kv.get<Activity[]>(ACTIVITIES_KEY);
  return NextResponse.json({ activities: activities || [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { title, day, description, location, category } = await request.json();

  if (!title || !day) {
    return NextResponse.json(
      { error: 'Title and day are required' },
      { status: 400 }
    );
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

  return NextResponse.json({ activities: updatedActivities });
}
