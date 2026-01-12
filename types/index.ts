export interface User {
  id: string;
  name: string;
  token: string;
  joinedAt: string;
}

export interface Vote {
  userId: string;
  userName: string;
  vote: 'yes' | 'no';
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  location?: string;
  day: string; // Format: "2025-02-11"
  creatorId: string;
  creatorName: string;
  createdAt: string;
  votes: Vote[];
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
