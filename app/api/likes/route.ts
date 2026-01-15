import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { kv } from '@vercel/kv';
import { TripData, Activity, Reaction } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const TRIP_KEY = 'trip:default';

// Default emojis for reactions
const DEFAULT_EMOJIS = ['👍', '👎', '🔥', '🍷', '😂', '🤯'];

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

    const { activityId, userName, type, emoji } = await request.json();

    if (!activityId || !userName) {
      return new Response(JSON.stringify({ error: 'Activity ID and user name are required' }), {
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
    
    // Handle emoji-based reactions (new system)
    if (emoji) {
      const reactions = activity.reactions || [];
      const reactionIndex = reactions.findIndex(r => r.emoji === emoji);
      
      let updatedReactions: Reaction[];
      
      if (reactionIndex >= 0) {
        // Reaction exists - toggle user
        const reaction = reactions[reactionIndex];
        const userIndex = reaction.users.indexOf(userName);
        
        if (userIndex >= 0) {
          // Remove user from reaction
          const updatedUsers = reaction.users.filter(u => u !== userName);
          if (updatedUsers.length === 0) {
            // Remove reaction if no users left
            updatedReactions = reactions.filter((_, i) => i !== reactionIndex);
          } else {
            // Update reaction with user removed
            updatedReactions = [...reactions];
            updatedReactions[reactionIndex] = { ...reaction, users: updatedUsers };
          }
        } else {
          // Add user to reaction
          updatedReactions = [...reactions];
          updatedReactions[reactionIndex] = { ...reaction, users: [...reaction.users, userName] };
        }
      } else {
        // Create new reaction
        updatedReactions = [...reactions, { emoji, users: [userName] }];
      }
      
      // Migrate legacy likes/dislikes to reactions on first emoji reaction
      let updatedLikes = activity.likes || [];
      let updatedDislikes = activity.dislikes || [];
      
      // If user had legacy like/dislike, remove them
      updatedLikes = updatedLikes.filter(name => name !== userName);
      updatedDislikes = updatedDislikes.filter(name => name !== userName);
      
      const updatedActivity: Activity = {
        ...activity,
        reactions: updatedReactions,
        likes: updatedLikes,
        dislikes: updatedDislikes,
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
    }
    
    // Legacy like/dislike handling (backward compatibility)
    const voteType = type === 'dislike' ? 'dislike' : 'like';
    const currentLikes = activity.likes || [];
    const currentDislikes = activity.dislikes || [];
    const reactions = activity.reactions || [];

    let updatedLikes: string[];
    let updatedDislikes: string[];
    let updatedReactions: Reaction[] = reactions;

    if (voteType === 'like') {
      // Handle like: remove from dislikes if present, toggle in likes
      updatedDislikes = currentDislikes.filter(name => name !== userName);
      if (currentLikes.includes(userName)) {
        // Remove from likes (unlike)
        updatedLikes = currentLikes.filter(name => name !== userName);
      } else {
        // Add to likes
        updatedLikes = [...currentLikes, userName];
      }
      
      // Also update reactions (migrate to new system)
      const thumbsUpIndex = updatedReactions.findIndex(r => r.emoji === '👍');
      if (thumbsUpIndex >= 0) {
        const reaction = updatedReactions[thumbsUpIndex];
        if (reaction.users.includes(userName)) {
          // Remove user
          const updatedUsers = reaction.users.filter(u => u !== userName);
          if (updatedUsers.length === 0) {
            updatedReactions = updatedReactions.filter((_, i) => i !== thumbsUpIndex);
          } else {
            updatedReactions[thumbsUpIndex] = { ...reaction, users: updatedUsers };
          }
        } else {
          // Add user
          updatedReactions[thumbsUpIndex] = { ...reaction, users: [...reaction.users, userName] };
        }
      } else if (updatedLikes.includes(userName)) {
        // Create new 👍 reaction
        updatedReactions = [...updatedReactions, { emoji: '👍', users: [userName] }];
      }
    } else {
      // Handle dislike: remove from likes if present, toggle in dislikes
      updatedLikes = currentLikes.filter(name => name !== userName);
      if (currentDislikes.includes(userName)) {
        // Remove from dislikes (undislike)
        updatedDislikes = currentDislikes.filter(name => name !== userName);
      } else {
        // Add to dislikes
        updatedDislikes = [...currentDislikes, userName];
      }
      
      // Also update reactions (migrate to new system)
      const thumbsDownIndex = updatedReactions.findIndex(r => r.emoji === '👎');
      if (thumbsDownIndex >= 0) {
        const reaction = updatedReactions[thumbsDownIndex];
        if (reaction.users.includes(userName)) {
          // Remove user
          const updatedUsers = reaction.users.filter(u => u !== userName);
          if (updatedUsers.length === 0) {
            updatedReactions = updatedReactions.filter((_, i) => i !== thumbsDownIndex);
          } else {
            updatedReactions[thumbsDownIndex] = { ...reaction, users: updatedUsers };
          }
        } else {
          // Add user
          updatedReactions[thumbsDownIndex] = { ...reaction, users: [...reaction.users, userName] };
        }
      } else if (updatedDislikes.includes(userName)) {
        // Create new 👎 reaction
        updatedReactions = [...updatedReactions, { emoji: '👎', users: [userName] }];
      }
    }

    // Create updated activity with new arrays
    const updatedActivity: Activity = {
      ...activity,
      likes: updatedLikes,
      dislikes: updatedDislikes,
      reactions: updatedReactions,
    };

    // Update ONLY this activity in the activities array
    const updatedActivities = [...tripData.activities];
    updatedActivities[activityIndex] = updatedActivity;

    // Update trip data with new activities array
    const updatedTripData: TripData = {
      ...tripData,
      activities: updatedActivities,
    };

    // Save the updated trip back to KV
    await kv.set(TRIP_KEY, updatedTripData);

    // Return the updated activity
    return new Response(JSON.stringify({ activity: updatedActivity }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return new Response(JSON.stringify({ error: 'Failed to toggle reaction' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}
