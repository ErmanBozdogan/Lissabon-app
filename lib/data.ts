import { TripData, Activity, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'trip.json');

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Initialize trip data
const getInitialTripData = (): TripData => {
  return {
    tripName: 'Lisbon Trip',
    startDate: '2025-02-11',
    endDate: '2025-02-15',
    days: [
      { date: '2025-02-11', label: 'Onsdag, 11. februar' },
      { date: '2025-02-12', label: 'Torsdag, 12. februar' },
      { date: '2025-02-13', label: 'Fredag, 13. februar' },
      { date: '2025-02-14', label: 'Lørdag, 14. februar' },
      { date: '2025-02-15', label: 'Søndag, 15. februar' },
    ],
    activities: [],
    users: [],
    inviteToken: uuidv4(),
  };
};

// Read trip data
export const readTripData = (): TripData => {
  ensureDataDir();
  
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = getInitialTripData();
    writeTripData(initialData);
    return initialData;
  }

  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading trip data:', error);
    return getInitialTripData();
  }
};

// Write trip data
export const writeTripData = (data: TripData): void => {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Get trip data
export const getTripData = (): TripData => {
  return readTripData();
};

// Add user
export const addUser = (name: string, token: string): User => {
  const data = readTripData();
  const user: User = {
    id: uuidv4(),
    name,
    token,
    joinedAt: new Date().toISOString(),
  };
  data.users.push(user);
  writeTripData(data);
  return user;
};

// Get user by token
export const getUserByToken = (token: string): User | null => {
  const data = readTripData();
  return data.users.find(u => u.token === token) || null;
};

// Add activity
export const addActivity = (
  title: string,
  day: string,
  creatorId: string,
  creatorName: string,
  description?: string,
  location?: string,
  category?: Activity['category']
): Activity => {
  const data = readTripData();
  const activity: Activity = {
    id: uuidv4(),
    title,
    description,
    location,
    day,
    creatorId,
    creatorName,
    createdAt: new Date().toISOString(),
    likes: [],
    dislikes: [],
    category,
  };
  data.activities.push(activity);
  writeTripData(data);
  return activity;
};

// Update activity
export const updateActivity = (
  activityId: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    location?: string;
    day?: string;
    category?: Activity['category'];
  }
): Activity | null => {
  const data = readTripData();
  const activity = data.activities.find(a => a.id === activityId);
  
  if (!activity) return null;
  
  // Only creator can update
  if (activity.creatorId !== userId) return null;
  
  // Update fields
  if (updates.title !== undefined) activity.title = updates.title;
  if (updates.description !== undefined) activity.description = updates.description;
  if (updates.location !== undefined) activity.location = updates.location;
  if (updates.day !== undefined) activity.day = updates.day;
  if (updates.category !== undefined) activity.category = updates.category;
  
  writeTripData(data);
  return activity;
};

// Delete activity
export const deleteActivity = (activityId: string, userId: string): boolean => {
  const data = readTripData();
  const activity = data.activities.find(a => a.id === activityId);
  
  if (!activity) return false;
  
  // Only creator can delete
  if (activity.creatorId !== userId) return false;
  
  data.activities = data.activities.filter(a => a.id !== activityId);
  writeTripData(data);
  return true;
};

// Like/unlike activity
export const toggleLike = (
  activityId: string,
  userName: string
): Activity | null => {
  const data = readTripData();
  const activity = data.activities.find(a => a.id === activityId);
  
  if (!activity) return null;
  
  // Ensure likes array exists
  const currentLikes = activity.likes || [];
  
  // Toggle like: if user name is in likes, remove it; otherwise add it
  if (currentLikes.includes(userName)) {
    activity.likes = currentLikes.filter(name => name !== userName);
  } else {
    activity.likes = [...currentLikes, userName];
  }
  
  writeTripData(data);
  return activity;
};

