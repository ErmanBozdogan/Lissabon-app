import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { getActivities, saveActivities } from '@/lib/kv';
import { Activity } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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

    // Get existing activities
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

    // Add to activities array and save
    const updatedActivities = [...activities, newActivity];
    await saveActivities(updatedActivities);

    return NextResponse.json({ activity: newActivity });
  } catch (error) {
    console.error('Error adding activity:', error);
    return NextResponse.json(
      { error: 'Failed to add activity' },
      { status: 500 }
    );
  }
}
