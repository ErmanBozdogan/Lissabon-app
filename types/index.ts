export interface User {
  id: string;
  name: string;
  token: string;
  joinedAt: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  location?: string;
  day: string; // Format: "2026-02-11"
  creatorId: string;
  creatorName: string;
  createdAt: string;
  likes: string[]; // Array of user names who liked this activity
  category?: 'restaurant' | 'brunch' | 'sightseeing' | 'bar' | 'cafe' | 'experience' | 'other';
}

export interface TripData {
  tripName: string;
  startDate: string;
  endDate: string;
  days: {
    date: string;
    label: string;
  }[];
  activities: Activity[];
  users: User[];
  inviteToken: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
