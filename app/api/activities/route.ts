import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { getActivities, saveActivities } from '@/lib/kv';
import { Activity } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const activities = await getActivities();
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error getting activities:', error);
    return NextResponse.json(
      { error: 'Failed to get activities' },
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

    const { title, day, description, location, category } = await request.json();

    if (!title || !day) {
      return NextResponse.json(
        { error: 'Title and day are required' },
        { status: 400 }
      );
    }

    // Read existing activities from KV
    const activities = await getActivities();
    
    // Create new activity
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

    // Append new activity and write updated list back to KV
    const updatedActivities = [...activities, newActivity];
    await saveActivities(updatedActivities);

    // Return the full updated activity list
    return NextResponse.json({ activities: updatedActivities });
  } catch (error) {
    console.error('Error adding activity:', error);
    return NextResponse.json(
      { error: 'Failed to add activity' },
      { status: 500 }
    );
  }
}
