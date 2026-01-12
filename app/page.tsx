'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TripData, Activity, User } from '@/types';
import DaySection from '@/components/DaySection';
import useSWR from 'swr';
// Client-only activity storage in localStorage
const ACTIVITIES_STORAGE_KEY = 'trip_activities';

const loadActivitiesFromStorage = (): Activity[] => {
  if (typeof window === 'undefined') return [];
  try {
    console.log('[LOAD] Loading activities from localStorage');
    console.log('[LOAD] Storage key:', ACTIVITIES_STORAGE_KEY);
    const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    console.log('[LOAD] Raw stored value:', stored);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[LOAD] Parsed activities count:', parsed.length);
      console.log('[LOAD] Activities:', parsed);
      return parsed;
    } else {
      console.log('[LOAD] No data found in localStorage for key:', ACTIVITIES_STORAGE_KEY);
    }
  } catch (error) {
    console.error('[LOAD] Error loading activities from localStorage:', error);
  }
  console.log('[LOAD] Returning empty array');
  return [];
};

const saveActivitiesToStorage = (activities: Activity[]): void => {
  if (typeof window === 'undefined') return;
  try {
    console.log('[SAVE] Saving activities to localStorage');
    console.log('[SAVE] Storage key:', ACTIVITIES_STORAGE_KEY);
    console.log('[SAVE] Activities count:', activities.length);
    console.log('[SAVE] Activities:', activities);
    const jsonString = JSON.stringify(activities);
    localStorage.setItem(ACTIVITIES_STORAGE_KEY, jsonString);
    console.log('[SAVE] Successfully saved to localStorage');
    // Verify it was saved
    const verify = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    console.log('[SAVE] Verification - data exists:', !!verify);
    console.log('[SAVE] Verification - data length:', verify?.length);
  } catch (error) {
    console.error('[SAVE] Error saving activities to localStorage:', error);
  }
};

const fetcher = async (url: string) => {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  return response.json();
};

function HomePageInner() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Store activities in state, initialized from localStorage
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Temporary debug banner
  const [origin, setOrigin] = useState<string>('');
  const [hasActivities, setHasActivities] = useState<boolean>(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      const stored = localStorage.getItem('trip_activities');
      setHasActivities(!!stored);
    }
  }, [activities]);

  // Fetch static trip data (structure only, no activities)
  const { data: staticTripData, error, mutate } = useSWR<TripData>(
    user ? '/api/trip' : null,
    fetcher,
    {
      refreshInterval: 0, // No auto-refresh needed for static data
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

// Load activities from localStorage after login is ready
useEffect(() => {
    console.log('[EFFECT] Load activities effect triggered');
    console.log('[EFFECT] user:', user ? { id: user.id, name: user.name } : null);
    console.log('[EFFECT] staticTripData:', staticTripData ? { tripName: staticTripData.tripName } : null);
    console.log('[EFFECT] isLoading:', isLoading);
    
    // Wait for both user authentication and trip data to be ready
    if (user && !isLoading) {
      console.log('[EFFECT] Conditions met - loading activities');
      const storedActivities = loadActivitiesFromStorage();
      console.log('[EFFECT] Loaded activities count:', storedActivities.length);
      setActivities(storedActivities);
      console.log('[EFFECT] Activities set in state');
    } else {
      console.log('[EFFECT] Conditions not met - skipping load');
      if (!user) console.log('[EFFECT] Missing: user');
    
      if (isLoading) console.log('[EFFECT] Still loading');
    }
  }, [user, isLoading]);

  // Merge static trip data with activities from state
  const tripData: TripData | undefined = staticTripData ? {
    ...staticTripData,
    activities: activities,
  } : undefined;

  useEffect(() => {
    console.log('[MOUNT] Component mounted');
    console.log('[MOUNT] Checking localStorage on mount');
    const checkStorage = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    console.log('[MOUNT] Activities in localStorage:', checkStorage ? JSON.parse(checkStorage).length : 0);
    console.log('[MOUNT] Storage key:', ACTIVITIES_STORAGE_KEY);
    checkAuth();
  }, []);


  const checkAuth = async () => {
    try {
      console.log('[AUTH] checkAuth called');
      const token = localStorage.getItem('auth_token');
      console.log('[AUTH] Token exists:', !!token);
      
      // Stateless auth: if token exists, user is authenticated
      // No need to verify with server - token presence = authenticated
      if (token) {
        // Get stored user info from localStorage (set during join)
        const storedName = localStorage.getItem('user_name') || 'User';
        const storedId = localStorage.getItem('user_id') || 'user';
        console.log('[AUTH] Stored user info:', { id: storedId, name: storedName });
        
        // Create a basic user object from the token
        // The token itself is the proof of authentication
        const user: User = {
          id: storedId,
          name: storedName,
          token: token,
          joinedAt: new Date().toISOString(),
        };
        
        // Optionally verify with server (but don't fail if it doesn't respond)
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            // Use server response if available, otherwise use basic user
            if (data.user) {
              // Update stored name if server provides it
              if (data.user.name) {
                localStorage.setItem('user_name', data.user.name);
              }
              console.log('[AUTH] Setting user from server response:', data.user);
              setUser(data.user);
            } else {
              console.log('[AUTH] Setting user from localStorage:', user);
              setUser(user);
            }
          } else {
            // Even if server check fails, trust the token (stateless)
            console.log('[AUTH] Server check failed, setting user from localStorage:', user);
            setUser(user);
          }
        } catch (error) {
          // If server check fails, still trust the token
          console.warn('[AUTH] Server check error, using token:', error);
          console.log('[AUTH] Setting user from localStorage:', user);
          setUser(user);
        }
      } else {
        // No token = not authenticated
        console.log('[AUTH] No token found, setting user to null');
        setUser(null);
      }
    } catch (error) {
      console.error('[AUTH] Auth check failed:', error);
      setUser(null);
    } finally {
      console.log('[AUTH] Setting isLoading to false');
      setIsLoading(false);
    }
  };


  const handleAddActivity = async (activity: Partial<Activity>): Promise<void> => {
    if (!user || !activity.title || !activity.day) {
      return;
    }

    // Create new activity object
    const newActivity: Activity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: activity.title,
      description: activity.description,
      location: activity.location,
      day: activity.day,
      creatorId: user.id,
      creatorName: user.name,
      createdAt: new Date().toISOString(),
      votes: [],
      category: activity.category,
    };

    // Add new activity to state and localStorage
    const updatedActivities = [...activities, newActivity];
    setActivities(updatedActivities);
    localStorage.setItem('trip_activities', JSON.stringify(updatedActivities));
  };

  const handleVote = async (activityId: string, vote: 'yes' | 'no'): Promise<void> => {
    if (!user || !tripData) return;

    // Find the activity
    const activityIndex = activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      console.error('Activity not found');
      return;
    }

    const activity = activities[activityIndex];
    const currentVote = activity.votes.find(v => v.userId === user.id);

    // If clicking the same vote, remove it
    if (currentVote?.vote === vote) {
      activity.votes = activity.votes.filter(v => v.userId !== user.id);
    } else {
      // Remove existing vote and add new one
      activity.votes = activity.votes.filter(v => v.userId !== user.id);
      activity.votes.push({ userId: user.id, userName: user.name, vote });
    }

    // Update the activities array
    const updatedActivities = [...activities];
    updatedActivities[activityIndex] = activity;

    // Update state and localStorage
    setActivities(updatedActivities);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trip_activities', JSON.stringify(updatedActivities));
    }
  };

  const handleEditActivity = async (activityId: string, updates: Partial<Activity>): Promise<void> => {
    if (!user) return;

    // Find and update the activity
    const activityIndex = activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      console.error('Activity not found');
      return;
    }

    // Only creator can edit
    if (activities[activityIndex].creatorId !== user.id) {
      console.error('Only creator can edit activity');
      return;
    }

    // Update the activity
    const updatedActivity = {
      ...activities[activityIndex],
      ...updates,
    };

    // Update the activities array
    const updatedActivities = [...activities];
    updatedActivities[activityIndex] = updatedActivity;

    // Update state and localStorage
    setActivities(updatedActivities);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trip_activities', JSON.stringify(updatedActivities));
    }
  };

  const handleDeleteActivity = async (activityId: string): Promise<void> => {
    if (!user) return;

    // Find the activity
    const activity = activities.find(a => a.id === activityId);
    if (!activity) {
      console.error('Activity not found');
      return;
    }

    // Only creator can delete
    if (activity.creatorId !== user.id) {
      console.error('Only creator can delete activity');
      return;
    }

    // Remove the activity
    const updatedActivities = activities.filter(a => a.id !== activityId);

    // Update state and localStorage
    setActivities(updatedActivities);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trip_activities', JSON.stringify(updatedActivities));
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {origin && (
          <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 text-xs text-yellow-800 dark:text-yellow-200">
            <div className="max-w-2xl mx-auto">
              <strong>Origin:</strong> {origin} | <strong>trip_activities exists:</strong> {hasActivities ? 'YES' : 'NO'}
            </div>
          </div>
        )}
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {origin && (
          <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 text-xs text-yellow-800 dark:text-yellow-200">
            <div className="max-w-2xl mx-auto">
              <strong>Origin:</strong> {origin} | <strong>trip_activities exists:</strong> {hasActivities ? 'YES' : 'NO'}
            </div>
          </div>
        )}
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Lisbon Trip Planner
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This is a private trip planning app. Enter the password to access.
            </p>
            <button
              onClick={() => router.push('/join')}
              className="w-full bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium py-2.5 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
            >
              Enter Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {origin && (
          <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 text-xs text-yellow-800 dark:text-yellow-200">
            <div className="max-w-2xl mx-auto">
              <strong>Origin:</strong> {origin} | <strong>trip_activities exists:</strong> {hasActivities ? 'YES' : 'NO'}
            </div>
          </div>
        )}
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">Failed to load trip data</p>
            <button
              onClick={() => mutate()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {origin && (
          <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 text-xs text-yellow-800 dark:text-yellow-200">
            <div className="max-w-2xl mx-auto">
              <strong>Origin:</strong> {origin} | <strong>trip_activities exists:</strong> {hasActivities ? 'YES' : 'NO'}
            </div>
          </div>
        )}
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading trip data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Temporary debug banner */}
      {origin && (
        <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 text-xs text-yellow-800 dark:text-yellow-200">
          <div className="max-w-2xl mx-auto">
            <strong>Origin:</strong> {origin} | <strong>trip_activities exists:</strong> {hasActivities ? 'YES' : 'NO'}
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header with Background Image */}
        <div className="relative rounded-2xl shadow-lg mb-8 sticky top-4 z-10 overflow-hidden min-h-[280px]">
          {/* Background Image */}
          <div className="absolute inset-0">
            {/* Try multiple image formats */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
              style={{
                backgroundImage: `
                  url(/images/header-bg.png),
                  url(/images/header-bg.jpg),
                  url(/images/header-bg.webp),
                  linear-gradient(135deg, #667eea 0%, #764ba2 100%)
                `,
              }}
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 p-8 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white tracking-tight mb-3 drop-shadow-2xl">
                  {tripData.tripName}
                </h1>
                <p className="text-xl text-white/95 font-semibold drop-shadow-lg mb-1">
                  {tripData.days[0].label.split(',')[0]} {tripData.days[0].label.split(',')[1]?.trim()} - {tripData.days[tripData.days.length - 1].label.split(',')[0]} {tripData.days[tripData.days.length - 1].label.split(',')[1]?.trim()}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-white/20">
              <p className="text-xs text-white/70">
                Logget ind som <span className="font-medium text-white/90">{user.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Days */}
        {tripData.days.map((day) => (
          <DaySection
            key={day.date}
            day={day}
            activities={tripData.activities}
            currentUserId={user.id}
            onAddActivity={handleAddActivity}
            onVote={handleVote}
            onEditActivity={handleEditActivity}
            onDeleteActivity={handleDeleteActivity}
          />
        ))}
      </div>
    </div>
  );
}
export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}
