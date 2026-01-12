import { NextRequest, NextResponse } from 'next/server';
import { addActivity } from '@/lib/data';
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

    const { title, day, description, location, category } = await request.json();

    if (!title || !day) {
      return NextResponse.json(
        { error: 'Title and day are required' },
        { status: 400 }
      );
    }

    const activity = addActivity(
      title,
      day,
      user.id,
      user.name,
      description,
      location,
      category
    );

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error adding activity:', error);
    return NextResponse.json(
      { error: 'Failed to add activity' },
      { status: 500 }
    );
  }
}
