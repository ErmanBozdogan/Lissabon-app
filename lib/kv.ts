import { kv } from '@vercel/kv';
import { Activity, TripData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const TRIP_KEY = 'trip:default';

const getDefaultTripData = (): TripData => {
  const dates = ['2025-02-11', '2025-02-12', '2025-02-13', '2025-02-14', '2025-02-15'];
  const danishMonths = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
  
  const getDanishWeekday = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const danishWeekdays = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    return danishWeekdays[dayOfWeek];
  };

  return {
    tripName: 'Lisbon Trip',
    startDate: '2025-02-11',
    endDate: '2025-02-15',
    days: dates.map(dateString => {
      const date = new Date(dateString + 'T00:00:00');
      const day = date.getDate();
      const month = danishMonths[date.getMonth()];
      const weekday = getDanishWeekday(dateString);
      return {
        date: dateString,
        label: `${weekday}, ${day}. ${month}`
      };
    }),
    activities: [],
    users: [],
    inviteToken: uuidv4(),
  };
};

export async function getActivities(): Promise<Activity[]> {
  const tripData = await kv.get<TripData>(TRIP_KEY);
  return tripData?.activities || [];
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  let tripData = await kv.get<TripData>(TRIP_KEY);
  if (!tripData) {
    tripData = getDefaultTripData();
  }
  tripData.activities = activities;
  await kv.set(TRIP_KEY, tripData);
}
