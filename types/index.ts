export interface User {
  id: string;
  name: string;
  token: string;
  joinedAt: string;
}

export interface Reaction {
  emoji: string;
  users: string[]; // Array of user names who reacted with this emoji
}

export interface Comment {
  id: string;
  activityId: string;
  userName: string;
  text: string;
  createdAt: string;
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
  likes: string[]; // Array of user names who liked this activity (legacy, kept for backward compatibility)
  dislikes: string[]; // Array of user names who disliked this activity (legacy, kept for backward compatibility)
  reactions?: Reaction[]; // New emoji-based reactions system
  comments?: Comment[]; // Comments on this activity
  budget?: 'cheap' | 'medium' | 'expensive'; // Budget indicator
  status?: 'confirmed' | 'tentative'; // Activity status - default is tentative
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
