'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

interface Location {
  name: string;
  location: string;
  category: 'airbnb' | 'sightseeing' | 'restaurant' | 'brunch' | 'breakfast';
  color: 'red' | 'blue' | 'green' | 'orange' | 'purple';
  label: string;
  lat?: number;
  lng?: number;
}

interface InteractiveMapProps {
  locations: Location[];
}

// Map container style
const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

// Default center (Lisbon)
const defaultCenter = {
  lat: 38.722252,
  lng: -9.139337,
};

// Color mapping for markers
const colorMap: Record<string, string> = {
  red: '#FF0000',
  blue: '#0000FF',
  green: '#00FF00',
  orange: '#FF8800',
  purple: '#8800FF',
};

// Category display names
const categoryNames: Record<string, string> = {
  airbnb: 'Airbnb',
  sightseeing: 'Sightseeing',
  restaurant: 'Restaurant',
  brunch: 'Brunch',
  breakfast: 'Breakfast',
};

export default function InteractiveMap({ locations }: InteractiveMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<Location | null>(null);
  const [geocodedLocations, setGeocodedLocations] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Filter out locations with "Various" or "Multiple"
  const validLocations = useMemo(() => {
    return locations.filter(loc => 
      loc.location && 
      !loc.location.includes('Various') && 
      !loc.location.includes('Multiple')
    );
  }, [locations]);

  // Geocode an address using Google Geocoding API
  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!apiKey) return null;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  }, [apiKey]);

  // Geocode all locations that don't have coordinates
  const geocodeAllLocations = useCallback(async () => {
    if (!apiKey || isGeocoding) return;
    
    setIsGeocoding(true);
    const newGeocoded = new Map(geocodedLocations);
    
    for (const loc of validLocations) {
      if (!loc.lat || !loc.lng) {
        const cacheKey = `${loc.name}, ${loc.location}`;
        if (!newGeocoded.has(cacheKey)) {
          const coords = await geocodeAddress(`${loc.name}, ${loc.location}`);
          if (coords) {
            newGeocoded.set(cacheKey, coords);
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    setGeocodedLocations(newGeocoded);
    setIsGeocoding(false);
  }, [apiKey, validLocations, geocodedLocations, geocodeAddress, isGeocoding]);

  // Get coordinates for a location (use provided or geocoded)
  const getLocationCoords = useCallback((loc: Location): { lat: number; lng: number } | null => {
    if (loc.lat && loc.lng) {
      return { lat: loc.lat, lng: loc.lng };
    }
    
    const cacheKey = `${loc.name}, ${loc.location}`;
    const cached = geocodedLocations.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    return null;
  }, [geocodedLocations]);

  // Locations with coordinates
  const locationsWithCoords = useMemo(() => {
    return validLocations.map(loc => {
      const coords = getLocationCoords(loc);
      return {
        ...loc,
        lat: coords?.lat,
        lng: coords?.lng,
      };
    }).filter(loc => loc.lat && loc.lng) as (Location & { lat: number; lng: number })[];
  }, [validLocations, getLocationCoords]);

  // Auto-geocode on mount if API key is available
  useEffect(() => {
    if (apiKey && validLocations.length > 0 && geocodedLocations.size === 0) {
      geocodeAllLocations();
    }
  }, [apiKey, validLocations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 p-8 text-center" style={{ height: '500px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="max-w-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
            Google Maps API Key Required
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            To display the interactive map with all locations, please add your Google Maps API key.
          </p>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-left">
            <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mb-2">
              Add to your <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">.env.local</code> file:
            </p>
            <code className="text-xs text-gray-800 dark:text-gray-200 block">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={13}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {locationsWithCoords.map((loc, index) => {
          // Create a custom colored marker icon
          const markerColor = colorMap[loc.color] || '#FF0000';
          
          // Create a colored circle marker
          const markerIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: markerColor,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          };

          return (
            <Marker
              key={`${loc.name}-${index}`}
              position={{ lat: loc.lat, lng: loc.lng }}
              label={{
                text: loc.label,
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '12px',
              }}
              icon={markerIcon}
              onClick={() => setSelectedMarker(loc)}
            />
          );
        })}

        {selectedMarker && selectedMarker.lat && selectedMarker.lng && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2">
              <h3 className="font-semibold text-gray-900 mb-1">{selectedMarker.name}</h3>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Category:</span> {categoryNames[selectedMarker.category]}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Address:</span> {selectedMarker.location}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}
