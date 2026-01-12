import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { getActivities, saveActivities } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { activityId, vote } = await request.json();

    if (!activityId || !vote) {
      return NextResponse.json(
        { error: 'Activity ID and vote are required' },
        { status: 400 }
      );
    }

    if (vote !== 'yes' && vote !== 'no') {
      return NextResponse.json(
        { error: 'Vote must be "yes" or "no"' },
        { status: 400 }
      );
    }

    const activities = await getActivities();
    const activityIndex = activities.findIndex(a => a.id === activityId);

    if (activityIndex === -1) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activity = activities[activityIndex];
    // Remove existing vote from this user
    activity.votes = activity.votes.filter(v => v.userId !== user.id);
    // Add new vote
    activity.votes.push({ userId: user.id, userName: user.name, vote });

    const updatedActivities = [...activities];
    updatedActivities[activityIndex] = activity;
    await saveActivities(updatedActivities);

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error voting on activity:', error);
    return NextResponse.json(
      { error: 'Failed to vote' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const activities = await getActivities();
    const activityIndex = activities.findIndex(a => a.id === activityId);

    if (activityIndex === -1) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activity = activities[activityIndex];
    // Remove vote from this user
    activity.votes = activity.votes.filter(v => v.userId !== user.id);

    const updatedActivities = [...activities];
    updatedActivities[activityIndex] = activity;
    await saveActivities(updatedActivities);

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    );
  }
}
