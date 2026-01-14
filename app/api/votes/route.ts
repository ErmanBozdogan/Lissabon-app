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

    const { activityId, vote, userName } = await request.json();

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

    // Use userName from request (client-provided) as unique identifier
    // Fall back to user.name if not provided (backward compatibility)
    const uniqueUserName = userName || user.name || 'User';
    const uniqueUserId = user.id || 'user';

    const activities = await getActivities();
    const activityIndex = activities.findIndex(a => a.id === activityId);

    if (activityIndex === -1) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activity = activities[activityIndex];
    // Remove existing vote from this user (check by userName for uniqueness)
    activity.votes = activity.votes.filter(v => v.userName !== uniqueUserName);
    // Add new vote with userName as unique identifier
    activity.votes.push({ userId: uniqueUserId, userName: uniqueUserName, vote });

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
    const userName = searchParams.get('userName');

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Use userName from query params (client-provided) as unique identifier
    const uniqueUserName = userName || user.name || 'User';

    const activities = await getActivities();
    const activityIndex = activities.findIndex(a => a.id === activityId);

    if (activityIndex === -1) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activity = activities[activityIndex];
    // Remove vote from this user (check by userName for uniqueness)
    activity.votes = activity.votes.filter(v => v.userName !== uniqueUserName);

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
