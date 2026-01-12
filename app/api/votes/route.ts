import { NextRequest, NextResponse } from 'next/server';
import { voteOnActivity, removeVote } from '@/lib/data';
import { getCurrentUser as getAuthUser } from '@/lib/auth';

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

    const activity = voteOnActivity(activityId, user.id, user.name, vote);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

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

    const activity = removeVote(activityId, user.id);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    );
  }
}
