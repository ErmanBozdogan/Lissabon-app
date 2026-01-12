'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TripData, Activity, User } from '@/types';
import DaySection from '@/components/DaySection';
import useSWR from 'swr';

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
  // Store activities in state, fetched from server
  const [activities, setActivities] = useState<Activity[]>([]);

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

  // Fetch activities from API
  const { data: activitiesData, mutate: mutateActivities } = useSWR<{ activities: Activity[] }>(
    user ? '/api/activities/list' : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => {
    if (activitiesData?.activities) {
      setActivities(activitiesData.activities);
    }
  }, [activitiesData]);

  // Merge static trip data with activities from state
  const tripData: TripData | undefined = staticTripData ? {
    ...staticTripData,
    activities: activities,
  } : undefined;

  useEffect(() => {
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

    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(activity),
    });

    if (response.ok) {
      mutateActivities();
    } else {
      throw new Error('Failed to add activity');
    }
  };

  const handleVote = async (activityId: string, vote: 'yes' | 'no'): Promise<void> => {
    if (!user || !tripData) return;

    const activity = activities.find(a => a.id === activityId);
    const currentVote = activity?.votes.find(v => v.userId === user.id);

    const token = localStorage.getItem('auth_token');
    
    // If clicking the same vote, remove it
    if (currentVote?.vote === vote) {
      const response = await fetch(`/api/votes?activityId=${activityId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (response.ok) {
        mutateActivities();
      }
    } else {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ activityId, vote }),
      });
      if (response.ok) {
        mutateActivities();
      }
    }
  };

  const handleEditActivity = async (activityId: string, updates: Partial<Activity>): Promise<void> => {
    if (!user) return;

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      mutateActivities();
    } else {
      throw new Error('Failed to update activity');
    }
  };

  const handleDeleteActivity = async (activityId: string): Promise<void> => {
    if (!user) return;

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/activities/${activityId}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (response.ok) {
      mutateActivities();
    } else {
      throw new Error('Failed to delete activity');
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
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
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
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
    );
  }

  if (!tripData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading trip data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
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
