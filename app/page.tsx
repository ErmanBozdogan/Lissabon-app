'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TripData, Activity, User } from '@/types';
import DaySection from '@/components/DaySection';
import InteractiveMap from '@/components/InteractiveMap';
import useSWR from 'swr';
import { clearAuth } from '@/lib/client-auth';

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
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [selectedInspiration, setSelectedInspiration] = useState<{ name: string; description?: string; location?: string; category?: string } | null>(null);

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
      // Ensure all activities have likes and dislikes arrays
      const migratedActivities = activitiesData.activities.map((activity: Activity) => ({
        ...activity,
        likes: activity.likes || [],
        dislikes: activity.dislikes || [],
      }));
      setActivities(migratedActivities);
    }
  }, [activitiesData]);

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/join');
    }
  }, [user, isLoading, router]);

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
        // IMPORTANT: Never overwrite localStorage user_name with "User" from server
        // The server returns generic "User" - we must use localStorage as source of truth
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            // Use server response for token validation, but ALWAYS use localStorage for name
            // Server returns generic "User" - we must preserve the actual name from localStorage
            if (data.user) {
              // Server check passed - token is valid
              // BUT: Server returns generic "User" - we MUST use localStorage name
              // NEVER overwrite localStorage with "User" from server
              // Create user object ALWAYS using localStorage name (source of truth)
              const userWithActualName: User = {
                ...data.user,
                id: storedId,
                name: storedName, // ALWAYS use localStorage name, never server's "User"
                token: token, // Use token from localStorage
              };
              
              console.log('[AUTH] Setting user with actual name from localStorage:', userWithActualName);
              setUser(userWithActualName);
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
      console.error('[Add Activity] Missing required fields:', { hasUser: !!user, title: activity.title, day: activity.day });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      // ALWAYS get userName from localStorage first (source of truth)
      // user.name might be "User" from server - we must use localStorage
      const userName = localStorage.getItem('user_name') || user.name;
      if (!userName || userName === 'User' || userName.trim() === '') {
        console.error('[Add Activity] User name is required and cannot be "User"', { 
          userName, 
          userFromState: user.name,
          localStorageName: localStorage.getItem('user_name')
        });
        alert('Error: User name is required. Please log in again.');
        return;
      }

      console.log('[Add Activity] Creating activity:', { title: activity.title, day: activity.day, creatorName: userName });

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...activity,
          creatorName: userName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to add activity' }));
        console.error('[Add Activity] API error:', errorData.error || 'Unknown error', 'Status:', response.status);
        alert(`Failed to add activity: ${errorData.error || 'Unknown error'}`);
        throw new Error(errorData.error || 'Failed to add activity');
      }

      // Use the returned activities to update React state
      const data = await response.json();
      console.log('[Add Activity] Success, received activities:', data.activities?.length || 0);
      
      if (data.activities && Array.isArray(data.activities)) {
        // Ensure all activities have dislikes array
        const migratedActivities = data.activities.map((activity: Activity) => ({
          ...activity,
          likes: activity.likes || [],
          dislikes: activity.dislikes || [],
        }));
        
        setActivities(migratedActivities);
        // Update SWR cache with the new data
        mutateActivities({ activities: migratedActivities }, false);
        
        // Show confirmation toast
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 2000);
      } else {
        console.error('[Add Activity] No activities in response, refetching...');
        // Refetch activities as fallback
        await mutateActivities();
      }
    } catch (error) {
      console.error('[Add Activity] Exception:', error);
      alert(`Error adding activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddInspiration = (inspiration: { name: string; description?: string; location?: string; category?: string }) => {
    setSelectedInspiration(inspiration);
    setShowDaySelector(true);
  };

  const handleConfirmInspiration = async (day: string) => {
    if (!selectedInspiration || !tripData) return;

    const category = (selectedInspiration.category || 'sightseeing') as 'restaurant' | 'brunch' | 'sightseeing' | 'bar' | 'cafe' | 'experience' | 'other';

    await handleAddActivity({
      title: selectedInspiration.name,
      description: selectedInspiration.description,
      location: selectedInspiration.location,
      day: day,
      category: category,
    });

    setShowDaySelector(false);
    setSelectedInspiration(null);
  };

  const handleVote = async (activityId: string, type: 'like' | 'dislike'): Promise<void> => {
    if (!user || !tripData) return;

    // ALWAYS get userName from localStorage first (source of truth)
    // user.name might be "User" from server - we must use localStorage
    const userName = localStorage.getItem('user_name') || user.name;
    
    if (!userName || userName === 'User' || userName.trim() === '') {
      console.error('[Vote] User name is required and cannot be "User"', {
        userName,
        userFromState: user.name,
        localStorageName: localStorage.getItem('user_name')
      });
      alert('Error: User name is required. Please log in again.');
      return;
    }

    const token = localStorage.getItem('auth_token');
    
    // Call the likes API to toggle like/dislike
    const response = await fetch('/api/likes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ activityId, userName, type }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.activity) {
        // Refetch activities to get updated list from server
        await mutateActivities();
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Failed to toggle vote' }));
      console.error('[Vote] Failed to toggle vote:', errorData.error || 'Unknown error');
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
      alert(`Failed to update activity: ${errorData.error || 'Unknown error'}`);
      throw new Error(errorData.error || 'Failed to update activity');
    }
  };

  const handleDeleteActivity = async (activityId: string): Promise<void> => {
    if (!user) return;

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/activities/${activityId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (response.ok) {
      await mutateActivities();
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete activity' }));
      console.error('Failed to delete activity:', errorData.error || 'Unknown error');
      throw new Error(errorData.error || 'Failed to delete activity');
    }
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    router.push('/join');
  };

  // Airbnb address constant
  const AIRBNB_ADDRESS = 'Calçada de Salvador Correia de Sá 4, Lisbon, Lisbon 1200-066';

  // Function to get Google Maps directions URL from Airbnb to activity
  const getDirectionsUrl = (destination: string) => {
    const origin = encodeURIComponent(AIRBNB_ADDRESS);
    const dest = encodeURIComponent(destination);
    return `https://www.google.com/maps/dir/${origin}/${dest}`;
  };

  // Function to get Google Maps search URL for activity
  const getMapsUrl = (query: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  // Collect all inspiration activities for the map with categories
  const getAllInspirationLocations = () => {
    const locations = [
      // Airbnb - Red
      { name: 'Our Airbnb', location: AIRBNB_ADDRESS, category: 'airbnb', color: 'red', label: 'A' },
      // Sightseeing - Blue
      { name: 'Belém Tower', location: 'Avenida Brasília, Lisboa', category: 'sightseeing', color: 'blue', label: 'S' },
      { name: 'Jerónimos Monastery', location: 'Praça do Império, Lisboa', category: 'sightseeing', color: 'blue', label: 'S' },
      { name: 'São Jorge Castle', location: 'Castelo de São Jorge, Lisboa', category: 'sightseeing', color: 'blue', label: 'S' },
      { name: 'Alfama District', location: 'Alfama, Lisboa', category: 'sightseeing', color: 'blue', label: 'S' },
      { name: 'Tram 28', location: 'Various stops, Lisboa', category: 'sightseeing', color: 'blue', label: 'S' },
      { name: 'Lisbon Oceanarium', location: 'Parque das Nações, Lisboa', category: 'sightseeing', color: 'blue', label: 'S' },
      // Restaurants - Green
      { name: 'Time Out Market', location: 'Mercado da Ribeira, Lisboa', category: 'restaurant', color: 'green', label: 'R' },
      { name: 'Cervejaria Ramiro', location: 'Avenida Almirante Reis, Lisboa', category: 'restaurant', color: 'green', label: 'R' },
      { name: 'Pasteis de Belém', location: 'Rua de Belém, Lisboa', category: 'restaurant', color: 'green', label: 'R' },
      { name: 'Taberna da Rua das Flores', location: 'Rua das Flores, Lisboa', category: 'restaurant', color: 'green', label: 'R' },
      { name: 'A Cevicheria', location: 'Rua Dom Pedro V, Lisboa', category: 'restaurant', color: 'green', label: 'R' },
      { name: 'Bairro do Avillez', location: 'Rua Nova da Trindade, Lisboa', category: 'restaurant', color: 'green', label: 'R' },
      // Brunch - Orange
      { name: 'Heim Cafe', location: 'Rua Santos-O-Velho, Lisboa', category: 'brunch', color: 'orange', label: 'B' },
      { name: 'The Mill', location: 'Rua do Poço dos Negros, Lisboa', category: 'brunch', color: 'orange', label: 'B' },
      { name: 'Dear Breakfast', location: 'Rua Gaivotas, Lisboa', category: 'brunch', color: 'orange', label: 'B' },
      { name: 'Nicolau Lisboa', location: 'Rua de São Nicolau, Lisboa', category: 'brunch', color: 'orange', label: 'B' },
      { name: 'Fauna & Flora', location: 'Rua da Esperança, Lisboa', category: 'brunch', color: 'orange', label: 'B' },
      { name: 'Comoba', location: 'Rua da Rosa, Lisboa', category: 'brunch', color: 'orange', label: 'B' },
      // Breakfast - Purple
      { name: 'Copenhagen Coffee Lab', location: 'Multiple locations, Lisboa', category: 'breakfast', color: 'purple', label: 'C' },
      { name: 'Fábrica Coffee Roasters', location: 'Rua das Portas de Santo Antão, Lisboa', category: 'breakfast', color: 'purple', label: 'C' },
      { name: 'Café Tati', location: 'Rua Nova do Carvalho, Lisboa', category: 'breakfast', color: 'purple', label: 'C' },
      { name: 'Café Brasileira', location: 'Rua Garrett, Lisboa', category: 'breakfast', color: 'purple', label: 'C' },
      { name: 'Casa Portuguesa do Pastel de Bacalhau', location: 'Rua Augusta, Lisboa', category: 'breakfast', color: 'purple', label: 'C' },
      { name: 'Manteigaria', location: 'Rua do Loreto, Lisboa', category: 'breakfast', color: 'purple', label: 'C' },
    ];
    return locations;
  };


  // Generate Google Maps URL with all locations and colored markers
  const getFullMapUrl = () => {
    const locations = getAllInspirationLocations();
    // Filter out locations with "Various" or "Multiple" as they're not specific
    const validLocations = locations.filter(loc => 
      loc.location && 
      !loc.location.includes('Various') && 
      !loc.location.includes('Multiple')
    );
    
    // Build markers - format: color:color|label:label|location (location should be URL encoded)
    const markers = validLocations
      .map(loc => {
        const location = `${loc.name}, ${loc.location}`;
        // Encode the location part only
        return `color:${loc.color}|label:${loc.label}|${encodeURIComponent(location)}`;
      });
    
    // Build the URL - each marker is a separate &markers= parameter
    const baseUrl = 'https://www.google.com/maps';
    const params = new URLSearchParams();
    params.set('q', 'Lisbon, Portugal');
    markers.forEach(marker => {
      params.append('markers', marker);
    });
    
    return `${baseUrl}?${params.toString()}`;
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
    return null;
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
          <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl font-medium text-xl backdrop-blur-sm">
            Rigtig godt valg
          </div>
        </div>
      )}

      {/* Day Selector Modal */}
      {showDaySelector && selectedInspiration && tripData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowDaySelector(false); setSelectedInspiration(null); }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Add &quot;{selectedInspiration.name}&quot; to calendar
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select which day to add this activity:
            </p>
            <div className="space-y-2 mb-6">
              {tripData.days.map((day) => (
                <button
                  key={day.date}
                  onClick={() => handleConfirmInspiration(day.date)}
                  className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-50">{day.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowDaySelector(false); setSelectedInspiration(null); }}
              className="w-full px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-50 font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Logout Button - Outside header, left side */}
        <div className="mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
            aria-label="Log out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium text-sm">Log out</span>
          </button>
        </div>

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
          <div className="relative z-10 p-8 pt-[42px] h-full flex flex-col justify-between">
            <div className="mb-4 mt-10">
              <h1 className="text-4xl font-bold text-white tracking-tight mb-3 drop-shadow-2xl text-center">
                {tripData.tripName}
              </h1>
              <p className="text-xl text-white/95 font-semibold drop-shadow-lg mb-1 text-center">
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
            <div className="pt-4 border-t border-white/20">
              <p className="text-xs text-white/70 text-center">
                Logget ind som <span className="font-medium text-white/90">{user.name || localStorage.getItem('user_name') || ''}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Airbnb Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-800/50 mb-4">
            <a
              href="https://www.airbnb.dk/rooms/1354341134071107243?source_impression_id=p3_1768404535_P3636nb6hNtiEVJt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group"
            >
              <div className="flex-shrink-0 relative">
                <img
                  src="https://images.unsplash.com/photo-1556912172-45b7ce8ba90e?w=200&h=200&fit=crop&q=80"
                  alt="Lisbon Airbnb preview"
                  className="w-16 h-16 rounded-xl object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.currentTarget;
                    // Fallback to local Airbnb logo image if external image fails
                    target.src = '/images/airbnb-logo.svg';
                    // If primary logo fails, use secondary fallback (both are proper Airbnb logos, no error icons)
                    target.onerror = () => {
                      target.src = '/images/airbnb-fallback.svg';
                    };
                  }}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-gray-900 dark:text-gray-50 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  Our Airbnb
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  View accommodation details
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

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
              />
              <button
                onClick={() => {
                  const address = encodeURIComponent('Calçada de Salvador Correia de Sá 4, Lisbon, Lisbon 1200-066');
                  window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                }}
                className="px-4 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow text-sm"
              >
                Open in Maps
              </button>
            </div>
          </div>
        </div>

        {/* Flight Information */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800/50 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <span className="text-xl">✈️</span>
              Outbound Flight
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Departure</span>
                <span className="text-sm text-gray-900 dark:text-gray-50 font-medium">Copenhagen Wed. Feb 11 at 13:30</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Arrival</span>
                <span className="text-sm text-gray-900 dark:text-gray-50 font-medium">Lisbon 16:05</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <span className="text-xl">✈️</span>
              Return Flight
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Departure</span>
                <span className="text-sm text-gray-900 dark:text-gray-50 font-medium">Lisbon Sun. Feb 15 at 16:55</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Arrival</span>
                <span className="text-sm text-gray-900 dark:text-gray-50 font-medium">Copenhagen 21:35</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activities Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
            What&apos;s the plan?
          </h2>
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
                    <div className="mb-3">
                      <a
                        href={item.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 mb-2 block"
                      >
                        📍 {item.location}
                      </a>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={getMapsUrl(`${item.name}, ${item.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          View on Maps
                        </a>
                        <a
                          href={getDirectionsUrl(`${item.name}, ${item.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Directions from Airbnb
                        </a>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleAddInspiration({ ...item, category: 'sightseeing' })}
                    className="w-full mt-3 px-4 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow text-sm"
                  >
                    Add to activity
                  </button>
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
                    <div className="mb-3">
                      <a
                        href={item.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 mb-2 block"
                      >
                        📍 {item.location}
                      </a>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={getMapsUrl(`${item.name}, ${item.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          View on Maps
                        </a>
                        <a
                          href={getDirectionsUrl(`${item.name}, ${item.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Directions from Airbnb
                        </a>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleAddInspiration({ ...item, category: 'restaurant' })}
                    className="w-full mt-3 px-4 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow text-sm"
                  >
                    Add to activity
                  </button>
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
                    <div className="mb-3">
                      <a
                        href={item.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 mb-2 block"
                      >
                        📍 {item.location}
                      </a>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={getMapsUrl(`${item.name}, ${item.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          View on Maps
                        </a>
                        <a
                          href={getDirectionsUrl(`${item.name}, ${item.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Directions from Airbnb
                        </a>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleAddInspiration({ ...item, category: 'brunch' })}
                    className="w-full mt-3 px-4 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow text-sm"
                  >
                    Add to activity
                  </button>
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
                    <div className="mb-3">
                      <a
                        href={item.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 mb-2 block"
                      >
                        📍 {item.location}
                      </a>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={getMapsUrl(`${item.name}, ${item.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          View on Maps
                        </a>
                        <a
                          href={getDirectionsUrl(`${item.name}, ${item.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Directions from Airbnb
                        </a>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleAddInspiration({ ...item, category: 'cafe' })}
                    className="w-full mt-3 px-4 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow text-sm"
                  >
                    Add to activity
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Overview Section */}
        <div className="mt-12 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight mb-6">
            Map Overview
          </h2>
          <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800/50">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              View all suggested locations and our Airbnb on the map below. Click &quot;Open in Google Maps&quot; to see all pins and get directions.
            </p>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 mb-4">
              <InteractiveMap locations={getAllInspirationLocations() as Array<{
                name: string;
                location: string;
                category: 'airbnb' | 'sightseeing' | 'restaurant' | 'brunch' | 'breakfast';
                color: 'red' | 'blue' | 'green' | 'orange' | 'purple';
                label: string;
              }>} />
            </div>
            <div className="mb-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Airbnb</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Sightseeing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Restaurants</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Brunch</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Breakfast</span>
              </div>
            </div>
            <a
              href={getFullMapUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Open in Google Maps with all locations
            </a>
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
