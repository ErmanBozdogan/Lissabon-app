'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TripData, Activity, User } from '@/types';
import DaySection from '@/components/DaySection';
import useSWR from 'swr';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  queueOfflineAction,
  syncOfflineQueue,
} from '@/lib/offline-sync';

const fetcher = async (url: string) => {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      // If offline, try to load from cache
      if (!navigator.onLine) {
        const cached = loadFromLocalStorage();
        if (cached) return cached;
      }
      throw new Error('Failed to fetch');
    }
    const data = await response.json();
    saveToLocalStorage(data);
    return data;
  } catch (error) {
    // Try to load from cache on error
    const cached = loadFromLocalStorage();
    if (cached) return cached;
    throw error;
  }
};

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string>('');

  // Check for invite token in URL
  const inviteToken = searchParams.get('token');

  // Fetch trip data with auto-refresh
  const { data: tripData, error, mutate } = useSWR<TripData>(
    user ? '/api/trip' : null,
    fetcher,
    {
      refreshInterval: 3000, // Refresh every 3 seconds for near real-time updates
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Set up offline sync
    const handleOnline = () => {
      syncOfflineQueue().then(() => {
        mutate();
      });
    };
    
    window.addEventListener('online', handleOnline);
    
    // Sync on mount if online
    if (navigator.onLine) {
      syncOfflineQueue().then(() => {
        mutate();
      });
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user, mutate]);

  useEffect(() => {
    if (inviteToken && !user) {
      // Show join form
      const name = prompt('Enter your name to join the trip:');
      if (name) {
        joinTrip(name, inviteToken);
      }
    }
  }, [inviteToken]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        fetchInviteUrl();
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const joinTrip = async (name: string, token: string) => {
    try {
      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, inviteToken: token }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.user.token);
        setUser(data.user);
        router.push('/');
        fetchInviteUrl();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join trip');
      }
    } catch (error) {
      console.error('Join failed:', error);
      alert('Failed to join trip');
    }
  };

  const fetchInviteUrl = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/invite', {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setInviteUrl(data.inviteUrl);
      }
    } catch (error) {
      console.error('Failed to fetch invite URL:', error);
    }
  };

  const handleAddActivity = async (activity: Partial<Activity>) => {
    try {
      if (!navigator.onLine) {
        // Queue for offline sync
        queueOfflineAction({
          type: 'add_activity',
          payload: activity,
          timestamp: Date.now(),
        });
        // Optimistically update local cache
        const cached = loadFromLocalStorage();
        if (cached) {
          const optimisticActivity: Activity = {
            id: `temp-${Date.now()}`,
            title: activity.title!,
            description: activity.description,
            location: activity.location,
            day: activity.day!,
            creatorId: user!.id,
            creatorName: user!.name,
            createdAt: new Date().toISOString(),
            votes: [],
            category: activity.category,
          };
          cached.activities.push(optimisticActivity);
          saveToLocalStorage(cached);
          mutate(cached, false);
        }
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
        mutate(); // Refresh trip data
      } else {
        throw new Error('Failed to add activity');
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      // Queue for offline sync
      queueOfflineAction({
        type: 'add_activity',
        payload: activity,
        timestamp: Date.now(),
      });
      alert('Failed to add activity. It will be synced when online.');
      throw error;
    }
  };

  const handleVote = async (activityId: string, vote: 'yes' | 'no') => {
    try {
      const currentVote = tripData?.activities.find(a => a.id === activityId)?.votes.find(v => v.userId === user?.id);
      
      if (!navigator.onLine) {
        // Queue for offline sync
        queueOfflineAction({
          type: 'vote',
          payload: { activityId, vote },
          timestamp: Date.now(),
        });
        // Optimistically update local cache
        const cached = loadFromLocalStorage();
        if (cached) {
          const activity = cached.activities.find(a => a.id === activityId);
          if (activity) {
            activity.votes = activity.votes.filter(v => v.userId !== user!.id);
            if (currentVote?.vote !== vote) {
              activity.votes.push({ userId: user!.id, userName: user!.name, vote });
            }
            saveToLocalStorage(cached);
            mutate(cached, false);
          }
        }
        return;
      }
      
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };
      
      // If clicking the same vote, remove it
      if (currentVote?.vote === vote) {
        const response = await fetch(`/api/votes?activityId=${activityId}`, {
          method: 'DELETE',
          headers,
        });
        if (response.ok) {
          mutate();
        }
      } else {
        const response = await fetch('/api/votes', {
          method: 'POST',
          headers,
          body: JSON.stringify({ activityId, vote }),
        });
        if (response.ok) {
          mutate();
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      // Queue for offline sync
      queueOfflineAction({
        type: 'vote',
        payload: { activityId, vote },
        timestamp: Date.now(),
      });
    }
  };

  const handleEditActivity = async (activityId: string, updates: Partial<Activity>) => {
    try {
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
        mutate(); // Refresh trip data
      } else {
        throw new Error('Failed to update activity');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      alert('Failed to update activity');
      throw error;
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });

      if (response.ok) {
        mutate(); // Refresh trip data
      } else {
        throw new Error('Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity');
      throw error;
    }
  };

  const handleShareInvite = () => {
    if (inviteUrl && navigator.share) {
      navigator.share({
        title: 'Join our Lisbon Trip!',
        text: 'Join our Lisbon trip planning group!',
        url: inviteUrl,
      });
    } else if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      alert('Invite link copied to clipboard!');
    } else {
      // If no invite URL yet, go to invite page
      router.push('/invite');
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
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Lisbon Trip Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This is a private trip planning app. You need an invite link to join.
          </p>
          {inviteToken ? (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                Enter your name to join:
              </p>
              <button
                onClick={() => {
                  const name = prompt('Enter your name:');
                  if (name) {
                    joinTrip(name, inviteToken);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Join Trip
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Ask someone in the group for the invite link.
            </p>
          )}
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
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={handleShareInvite}
                  className="p-2.5 text-white/90 hover:text-white hover:bg-white/20 transition-all rounded-xl backdrop-blur-sm border border-white/20"
                  aria-label="Share invite"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                <a
                  href="/invite"
                  className="p-2.5 text-white/90 hover:text-white hover:bg-white/20 transition-all rounded-xl backdrop-blur-sm border border-white/20"
                  aria-label="Get invite link"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </a>
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
