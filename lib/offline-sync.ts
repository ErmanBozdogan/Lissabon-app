// Offline sync utilities using localStorage
import { TripData, Activity } from '@/types';

const STORAGE_KEY = 'trip_data_cache';
const STORAGE_TIMESTAMP = 'trip_data_timestamp';

export const saveToLocalStorage = (data: TripData): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): TripData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }
  return null;
};

export const getCacheTimestamp = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    return null;
  }
};

export const queueOfflineAction = (action: {
  type: 'add_activity' | 'vote' | 'delete_activity';
  payload: any;
  timestamp: number;
}): void => {
  if (typeof window === 'undefined') return;
  try {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    queue.push(action);
    localStorage.setItem('offline_queue', JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to queue offline action:', error);
  }
};

export const getOfflineQueue = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('offline_queue') || '[]');
  } catch (error) {
    return [];
  }
};

export const clearOfflineQueue = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('offline_queue');
};

export const syncOfflineQueue = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const syncedActions: number[] = [];

  for (const action of queue) {
    try {
      let response: Response | null = null;

      switch (action.type) {
        case 'add_activity':
          response = await fetch('/api/activities', {
            method: 'POST',
            headers,
            body: JSON.stringify(action.payload),
          });
          break;
        case 'vote':
          response = await fetch('/api/votes', {
            method: 'POST',
            headers,
            body: JSON.stringify(action.payload),
          });
          break;
        case 'delete_activity':
          response = await fetch(`/api/activities/${action.payload.activityId}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          break;
      }

      if (response && response.ok) {
        syncedActions.push(action.timestamp);
      }
    } catch (error) {
      console.error('Failed to sync action:', error);
    }
  }

  // Remove synced actions from queue
  if (syncedActions.length > 0) {
    const remainingQueue = queue.filter(
      (action) => !syncedActions.includes(action.timestamp)
    );
    localStorage.setItem('offline_queue', JSON.stringify(remainingQueue));
  }
};
