import { NextRequest, NextResponse } from 'next/server';
import { deleteActivity, updateActivity } from '@/lib/data';
import { getCurrentUser as getAuthUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = params;
    const success = deleteActivity(id, user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Activity not found or unauthorized' },
        { status: 404 }
      );
    }

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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = params;
    const updates = await request.json();

    const activity = updateActivity(id, user.id, updates);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}
