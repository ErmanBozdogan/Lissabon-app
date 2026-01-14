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
  const [showToast, setShowToast] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

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
    user ? '/api/activities' : null,
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
        const storedName = localStorage.getItem('user_name') || '';
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to add activity' }));
      console.error('Failed to add activity:', errorData.error || 'Unknown error');
      throw new Error(errorData.error || 'Failed to add activity');
    }

    // Use the returned activities to update React state
    const data = await response.json();
    if (data.activities) {
      setActivities(data.activities);
      // Update SWR cache with the new data
      mutateActivities({ activities: data.activities }, false);
      
      // Show confirmation toast
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 2000);
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
        const data = await response.json();
        if (data.activity) {
          // Refetch activities to get updated list
          await mutateActivities();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to vote' }));
        console.error('Failed to vote:', errorData.error || 'Unknown error');
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
        const data = await response.json();
        if (data.activity) {
          // Refetch activities to get updated list
          await mutateActivities();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to vote' }));
        console.error('Failed to vote:', errorData.error || 'Unknown error');
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
      await mutateActivities();
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update activity' }));
      console.error('Failed to update activity:', errorData.error || 'Unknown error');
      throw new Error(errorData.error || 'Failed to update activity');
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
      await mutateActivities();
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete activity' }));
      console.error('Failed to delete activity:', errorData.error || 'Unknown error');
      throw new Error(errorData.error || 'Failed to delete activity');
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
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="bg-green-600 text-white px-8 py-4 rounded-2xl shadow-xl font-medium text-xl backdrop-blur-sm">
            kæft det bliver godt
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header with Background Image */}
        <div className="relative rounded-2xl shadow-lg mb-8 overflow-hidden min-h-[280px]">
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
                  {(() => {
                    const startDate = new Date(tripData.days[0].date);
                    const endDate = new Date(tripData.days[tripData.days.length - 1].date);
                    const startDay = startDate.getDate();
                    const endDay = endDate.getDate();
                    const startMonth = startDate.toLocaleDateString('en-US', { month: 'long' });
                    const endMonth = endDate.toLocaleDateString('en-US', { month: 'long' });
                    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
                  })()}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-white/20">
              <p className="text-xs text-white/70">
                Logget ind som <span className="font-medium text-white/90">{user.name || localStorage.getItem('user_name') || 'User'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Airbnb Section */}
        <div className="mb-8">
          <a
            href="https://www.airbnb.dk/rooms/1354341134071107243?source_impression_id=p3_1768404535_P3636nb6hNtiEVJt"
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="bg-white dark:bg-gray-900/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-800/50 mb-4">
              <div className="relative h-48 overflow-hidden">
                <img
                  src="/images/airbnb-preview.jpg"
                  alt="Airbnb accommodation preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback if image doesn't exist yet
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center"><svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10zm-1-15h2v6h-2zm0 8h2v2h-2z"/></svg></div>';
                  }}
                />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base text-gray-900 dark:text-gray-50 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      Our Airbnb
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      View accommodation details
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </div>
            </div>
          </a>

          {/* Address */}
          <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800/50">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Address
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="Calçada de Salvador Correia de Sá 4, Lisbon, Lisbon 1200-066"
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all text-sm"
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(e.currentTarget.value);
                  setAddressCopied(true);
                  setTimeout(() => setAddressCopied(false), 2000);
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText('Calçada de Salvador Correia de Sá 4, Lisbon, Lisbon 1200-066');
                  setAddressCopied(true);
                  setTimeout(() => setAddressCopied(false), 2000);
                }}
                className="px-4 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow text-sm"
              >
                {addressCopied ? 'Copied!' : 'Copy'}
              </button>
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

        {/* Inspiration Section */}
        <div className="mt-12 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight mb-6">
            Inspiration
          </h2>
          
          {/* Sightseeing */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              Sightseeing
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: 'Belém Tower', description: 'Historic tower and UNESCO World Heritage site', location: 'Avenida Brasília, Lisboa', mapsUrl: 'https://maps.google.com/?q=Belem+Tower+Lisbon' },
                { name: 'Jerónimos Monastery', description: 'Manueline architecture masterpiece', location: 'Praça do Império, Lisboa', mapsUrl: 'https://maps.google.com/?q=Jeronimos+Monastery+Lisbon' },
                { name: 'São Jorge Castle', description: 'Medieval castle with panoramic city views', location: 'Castelo de São Jorge, Lisboa', mapsUrl: 'https://maps.google.com/?q=Sao+Jorge+Castle+Lisbon' },
                { name: 'Alfama District', description: 'Historic neighborhood with narrow streets', location: 'Alfama, Lisboa', mapsUrl: 'https://maps.google.com/?q=Alfama+Lisbon' },
                { name: 'Tram 28', description: 'Iconic tram route through historic neighborhoods', location: 'Various stops, Lisboa', mapsUrl: 'https://maps.google.com/?q=Tram+28+Lisbon' },
                { name: 'Lisbon Oceanarium', description: 'One of the largest aquariums in Europe', location: 'Parque das Nações, Lisboa', mapsUrl: 'https://maps.google.com/?q=Lisbon+Oceanarium' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-800/50"
                >
                  <h4 className="font-semibold text-base text-gray-900 dark:text-gray-50 mb-1.5">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                    {item.description}
                  </p>
                  {item.location && (
                    <a
                      href={item.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                    >
                      📍 {item.location}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Restaurants */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              Restaurants
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: 'Time Out Market', description: 'Food hall with local and international cuisine', location: 'Mercado da Ribeira, Lisboa', mapsUrl: 'https://maps.google.com/?q=Time+Out+Market+Lisbon' },
                { name: 'Cervejaria Ramiro', description: 'Famous seafood restaurant', location: 'Avenida Almirante Reis, Lisboa', mapsUrl: 'https://maps.google.com/?q=Cervejaria+Ramiro+Lisbon' },
                { name: 'Pasteis de Belém', description: 'Original pastel de nata bakery', location: 'Rua de Belém, Lisboa', mapsUrl: 'https://maps.google.com/?q=Pasteis+de+Belem+Lisbon' },
                { name: 'Taberna da Rua das Flores', description: 'Traditional Portuguese tapas', location: 'Rua das Flores, Lisboa', mapsUrl: 'https://maps.google.com/?q=Taberna+da+Rua+das+Flores+Lisbon' },
                { name: 'A Cevicheria', description: 'Modern Peruvian-inspired seafood', location: 'Rua Dom Pedro V, Lisboa', mapsUrl: 'https://maps.google.com/?q=A+Cevicheria+Lisbon' },
                { name: 'Bairro do Avillez', description: 'Celebrity chef José Avillez restaurant', location: 'Rua Nova da Trindade, Lisboa', mapsUrl: 'https://maps.google.com/?q=Bairro+do+Avillez+Lisbon' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-800/50"
                >
                  <h4 className="font-semibold text-base text-gray-900 dark:text-gray-50 mb-1.5">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                    {item.description}
                  </p>
                  {item.location && (
                    <a
                      href={item.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                    >
                      📍 {item.location}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Brunch */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="text-2xl">🥐</span>
              Brunch
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: 'Heim Cafe', description: 'Popular brunch spot with great coffee and avocado toast', location: 'Rua Santos-O-Velho, Lisboa', mapsUrl: 'https://maps.google.com/?q=Heim+Cafe+Lisbon' },
                { name: 'The Mill', description: 'Australian-style brunch with excellent pancakes', location: 'Rua do Poço dos Negros, Lisboa', mapsUrl: 'https://maps.google.com/?q=The+Mill+Lisbon' },
                { name: 'Dear Breakfast', description: 'Trendy brunch cafe with Instagram-worthy dishes', location: 'Rua Gaivotas, Lisboa', mapsUrl: 'https://maps.google.com/?q=Dear+Breakfast+Lisbon' },
                { name: 'Nicolau Lisboa', description: 'Cozy brunch spot with Portuguese and international options', location: 'Rua de São Nicolau, Lisboa', mapsUrl: 'https://maps.google.com/?q=Nicolau+Lisboa' },
                { name: 'Fauna & Flora', description: 'Plant-based brunch with healthy options', location: 'Rua da Esperança, Lisboa', mapsUrl: 'https://maps.google.com/?q=Fauna+Flora+Lisbon' },
                { name: 'Comoba', description: 'Modern brunch with fresh ingredients and great coffee', location: 'Rua da Rosa, Lisboa', mapsUrl: 'https://maps.google.com/?q=Comoba+Lisbon' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-800/50"
                >
                  <h4 className="font-semibold text-base text-gray-900 dark:text-gray-50 mb-1.5">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                    {item.description}
                  </p>
                  {item.location && (
                    <a
                      href={item.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                    >
                      📍 {item.location}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Breakfast */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="text-2xl">☕</span>
              Breakfast
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: 'Copenhagen Coffee Lab', description: 'Danish-style coffee and pastries', location: 'Multiple locations, Lisboa', mapsUrl: 'https://maps.google.com/?q=Copenhagen+Coffee+Lab+Lisbon' },
                { name: 'Fábrica Coffee Roasters', description: 'Specialty coffee with excellent breakfast options', location: 'Rua das Portas de Santo Antão, Lisboa', mapsUrl: 'https://maps.google.com/?q=Fabrica+Coffee+Roasters+Lisbon' },
                { name: 'Café Tati', description: 'Traditional Portuguese breakfast with pastries', location: 'Rua Nova do Carvalho, Lisboa', mapsUrl: 'https://maps.google.com/?q=Cafe+Tati+Lisbon' },
                { name: 'Café Brasileira', description: 'Historic cafe with traditional Portuguese breakfast', location: 'Rua Garrett, Lisboa', mapsUrl: 'https://maps.google.com/?q=Cafe+Brasileira+Lisbon' },
                { name: 'Casa Portuguesa do Pastel de Bacalhau', description: 'Traditional cod cakes and coffee', location: 'Rua Augusta, Lisboa', mapsUrl: 'https://maps.google.com/?q=Casa+Portuguesa+do+Pastel+de+Bacalhau+Lisbon' },
                { name: 'Manteigaria', description: 'Fresh pastel de nata and coffee', location: 'Rua do Loreto, Lisboa', mapsUrl: 'https://maps.google.com/?q=Manteigaria+Lisbon' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-800/50"
                >
                  <h4 className="font-semibold text-base text-gray-900 dark:text-gray-50 mb-1.5">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                    {item.description}
                  </p>
                  {item.location && (
                    <a
                      href={item.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                    >
                      📍 {item.location}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
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
