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

    // Create a deep copy of the activity to avoid mutation issues
    const activity = { ...activities[activityIndex] };
    // Ensure votes array exists (defensive check)
    const existingVotes = activity.votes || [];
    // Remove existing vote from this user (check by userName for uniqueness)
    // Create a new votes array without this user's existing vote
    const filteredVotes = existingVotes.filter(v => v.userName !== uniqueUserName);
    // Add new vote with userName as unique identifier
    const updatedVotes = [...filteredVotes, { userId: uniqueUserId, userName: uniqueUserName, vote }];
    
    // Create updated activity with new votes array
    const updatedActivity = {
      ...activity,
      votes: updatedVotes,
    };

    // Create a new activities array with the updated activity
    const updatedActivities = [...activities];
    updatedActivities[activityIndex] = updatedActivity;
    await saveActivities(updatedActivities);

    return NextResponse.json({ activity: updatedActivity });
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

    // Create a deep copy of the activity to avoid mutation issues
    const activity = { ...activities[activityIndex] };
    // Ensure votes array exists (defensive check)
    const existingVotes = activity.votes || [];
    // Remove vote from this user (check by userName for uniqueness)
    // Create a new votes array without this user's vote
    const updatedVotes = existingVotes.filter(v => v.userName !== uniqueUserName);
    
    // Create updated activity with new votes array
    const updatedActivity = {
      ...activity,
      votes: updatedVotes,
    };

    // Create a new activities array with the updated activity
    const updatedActivities = [...activities];
    updatedActivities[activityIndex] = updatedActivity;
    await saveActivities(updatedActivities);

    return NextResponse.json({ activity: updatedActivity });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    );
  }
}
