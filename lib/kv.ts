import { kv } from '@vercel/kv';
import { Activity } from '@/types';

const ACTIVITIES_KEY = 'trip:activities';

export async function getActivities(): Promise<Activity[]> {
  const activities = await kv.get<Activity[]>(ACTIVITIES_KEY);
  return activities || [];
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  await kv.set(ACTIVITIES_KEY, activities);
}
