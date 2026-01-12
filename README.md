# Lisbon Trip Planner

A private, shared travel planning app for a trip to Lisbon (February 11-15, 2025) built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Private & Invite-Only**: Access via shareable invite links
- **Real-Time Sync**: Near real-time updates across all devices (3-second polling)
- **Offline Support**: Works offline with automatic sync when connection is restored
- **Activity Management**: Add activities with categories (restaurants, brunch, sightseeing, bars, cafes, experiences)
- **Voting System**: Vote 👍 or 👎 on activities
- **Mobile-First**: Optimized for mobile devices
- **Day-Based Organization**: Activities organized by day (Feb 11-15)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Fetching**: SWR for real-time updates
- **Storage**: JSON file (can be migrated to database)
- **Authentication**: Token-based with invite links

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### First User Setup

When you first run the app, it will create a trip data file at `data/trip.json` with:
- Pre-configured dates (February 11-15, 2025)
- An invite token for sharing

**To get the generic invite link:**

1. **Option 1**: Visit http://localhost:3000/invite (works even before joining)
2. **Option 2**: After joining, click "Share Invite" or "🔗 Get Link" in the header
3. Copy the link and share it with your friends via Messages or any other method

The invite link format is: `http://localhost:3000/join?token=YOUR_TOKEN`

When someone clicks the link, they'll be taken to a join page where they can enter their name.

## Usage

### Joining the Trip

1. Click on an invite link shared by a group member
2. Enter your name (Erman, Mathias, Morten, or Dardan)
3. You're in! Your authentication persists across sessions

### Adding Activities

1. Click "+ Add" on any day
2. Fill in the activity details:
   - Title (required)
   - Category (restaurant, brunch, sightseeing, bar, cafe, experience, other)
   - Description (optional)
   - Location (optional)
3. Click "Add Activity"

### Voting

- Click 👍 to vote yes
- Click 👎 to vote no
- Click the same button again to remove your vote
- Vote counts are displayed on each activity

### Offline Mode

- The app works offline
- Activities and votes are cached locally
- When you come back online, changes sync automatically

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy!

The app is fully compatible with Vercel's serverless functions.

### Environment Variables

For production, set:
- `NEXT_PUBLIC_BASE_URL`: Your production URL (for invite links)

## Project Structure

```
├── app/
│   ├── api/          # API routes
│   ├── join/         # Join page
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Main trip page
│   └── globals.css   # Global styles
├── components/       # React components
├── lib/             # Utilities (auth, data, offline sync)
├── types/           # TypeScript types
└── data/            # Trip data storage (JSON)
```

## Data Storage

Currently uses a JSON file at `data/trip.json`. For production with multiple instances, consider migrating to:
- PostgreSQL
- MongoDB
- Supabase
- Firebase

## Notes

- The app uses token-based authentication stored in localStorage
- Invite links are shareable and work via iPhone Messages
- All users can see and modify the shared trip plan
- Activities can only be deleted by their creator

## License

Private project for Lisbon trip planning.
