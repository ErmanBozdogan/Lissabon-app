import { kv } from '@vercel/kv';
import { Activity } from '@/types';

const ACTIVITIES_KEY = 'trip_activities';

export async function getActivities(): Promise<Activity[]> {
  try {
    const activities = await kv.get<Activity[]>(ACTIVITIES_KEY);
    return activities || [];
  } catch (error) {
    console.error('Error getting activities from KV:', error);
    return [];
  }
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  try {
    await kv.set(ACTIVITIES_KEY, activities);
  } catch (error) {
    console.error('Error saving activities to KV:', error);
    throw error;
  }
}
