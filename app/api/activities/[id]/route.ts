import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { getActivities, saveActivities } from '@/lib/kv';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Get userName from request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      requestBody = {};
    }
    const { userName } = requestBody;
    
    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      );
    }
    
    const activities = await getActivities();
    const activity = activities.find(a => a.id === id);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    
    // Check authorization by creatorName (userName is the unique identifier)
    if (activity.creatorName !== userName) {
      return NextResponse.json(
        { error: 'Unauthorized - only the creator can delete this activity' },
        { status: 403 }
      );
    }

    const updatedActivities = activities.filter(a => a.id !== id);
    await saveActivities(updatedActivities);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const requestData = await request.json();
    const { userName, ...updates } = requestData;
    const activities = await getActivities();
    const activityIndex = activities.findIndex(a => a.id === id);

    if (activityIndex === -1) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Get userName from request or use generic fallback
    const requestUserName = userName || user.name;
    
    // Check authorization by creatorName (userName is the unique identifier)
    if (activities[activityIndex].creatorName !== requestUserName) {
      return NextResponse.json(
        { error: 'Unauthorized - only the creator can edit this activity' },
        { status: 403 }
      );
    }

    const updatedActivity = {
      ...activities[activityIndex],
      ...updates,
    };

    const updatedActivities = [...activities];
    updatedActivities[activityIndex] = updatedActivity;
    await saveActivities(updatedActivities);

    return NextResponse.json({ activity: updatedActivity });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}
