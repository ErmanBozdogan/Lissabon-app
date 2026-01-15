import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { kv } from '@vercel/kv';
import { TripData, Activity, Comment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const TRIP_KEY = 'trip:default';

// POST - Add a comment
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const { activityId, userName, text } = await request.json();

    if (!activityId || !userName || !text) {
      return new Response(JSON.stringify({ error: 'Activity ID, user name, and text are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Reject "User" as userName - it's a placeholder, not a real name
    if (userName === 'User' || userName.trim() === '') {
      return new Response(JSON.stringify({ error: 'Invalid user name. Please log in again.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: 'Comment text cannot be empty' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Read the current trip from KV
    let tripData = await kv.get<TripData>(TRIP_KEY);
    if (!tripData) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Find the correct activity
    const activityIndex = tripData.activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const activity = { ...tripData.activities[activityIndex] };
    const comments = activity.comments || [];

    // Create new comment
    const newComment: Comment = {
      id: uuidv4(),
      activityId,
      userName,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...comments, newComment];
    const updatedActivity: Activity = {
      ...activity,
      comments: updatedComments,
    };

    const updatedActivities = [...tripData.activities];
    updatedActivities[activityIndex] = updatedActivity;

    await kv.set(TRIP_KEY, { ...tripData, activities: updatedActivities });

    return new Response(JSON.stringify({ comment: newComment, activity: updatedActivity }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to add comment' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}

// DELETE - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const { activityId, commentId, userName } = await request.json();

    if (!activityId || !commentId || !userName) {
      return new Response(JSON.stringify({ error: 'Activity ID, comment ID, and user name are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Read the current trip from KV
    let tripData = await kv.get<TripData>(TRIP_KEY);
    if (!tripData) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Find the correct activity
    const activityIndex = tripData.activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const activity = { ...tripData.activities[activityIndex] };
    const comments = activity.comments || [];

    // Find the comment
    const comment = comments.find(c => c.id === commentId);
    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Check if user owns the comment
    if (comment.userName !== userName) {
      return new Response(JSON.stringify({ error: 'Not authorized to delete this comment' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Remove the comment
    const updatedComments = comments.filter(c => c.id !== commentId);
    const updatedActivity: Activity = {
      ...activity,
      comments: updatedComments,
    };

    const updatedActivities = [...tripData.activities];
    updatedActivities[activityIndex] = updatedActivity;

    await kv.set(TRIP_KEY, { ...tripData, activities: updatedActivities });

    return new Response(JSON.stringify({ activity: updatedActivity }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete comment' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}

// PATCH - Update a comment
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const { activityId, commentId, userName, text } = await request.json();

    if (!activityId || !commentId || !userName || !text) {
      return new Response(JSON.stringify({ error: 'Activity ID, comment ID, user name, and text are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: 'Comment text cannot be empty' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Read the current trip from KV
    let tripData = await kv.get<TripData>(TRIP_KEY);
    if (!tripData) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Find the correct activity
    const activityIndex = tripData.activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const activity = { ...tripData.activities[activityIndex] };
    const comments = activity.comments || [];

    // Find the comment
    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const comment = comments[commentIndex];

    // Check if user owns the comment
    if (comment.userName !== userName) {
      return new Response(JSON.stringify({ error: 'Not authorized to edit this comment' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Update the comment
    const updatedComment: Comment = {
      ...comment,
      text: text.trim(),
    };

    const updatedComments = [...comments];
    updatedComments[commentIndex] = updatedComment;

    const updatedActivity: Activity = {
      ...activity,
      comments: updatedComments,
    };

    const updatedActivities = [...tripData.activities];
    updatedActivities[activityIndex] = updatedActivity;

    await kv.set(TRIP_KEY, { ...tripData, activities: updatedActivities });

    return new Response(JSON.stringify({ comment: updatedComment, activity: updatedActivity }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to update comment' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}
