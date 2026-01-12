import { NextRequest, NextResponse } from 'next/server';
import { addUser, getTripData } from '@/lib/data';
import { setAuthToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Password-based authentication endpoint
 * 
 * Flow:
 * 1. Receives: { name: string, password: string } from frontend
 * 2. Validates password using password.trim() === TRIP_PASSWORD
 * 3. Creates new user or returns existing user by name
 * 4. Sets auth token cookie and returns user with token
 * 
 * IMPORTANT: Do not add inviteToken or any other fields to this endpoint.
 * The frontend sends exactly { name, password } and nothing else.
 */
const TRIP_PASSWORD = 'Alpay';

export async function POST(request: NextRequest) {
  try {
    // Extract exactly: { name: string, password: string }
    // No other fields should be expected or processed
    const { name, password } = await request.json();

    // Validate required fields
    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required' },
        { status: 400 }
      );
    }

    // Validate password - use trim() to match frontend trimming
    // This ensures consistent validation on both sides
    if (password.trim() !== TRIP_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    const tripData = getTripData();

    // Check if user already exists (case-insensitive name matching)
    const trimmedName = name.trim();
    const existingUser = tripData.users.find(u => u.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (existingUser) {
      // Return existing user - no need to create duplicate
      const response = NextResponse.json({ user: existingUser });
      await setAuthToken(existingUser.token);
      return response;
    }

    // Create new user with trimmed name
    const userToken = uuidv4();
    const user = addUser(trimmedName, userToken);

    const response = NextResponse.json({ user });
    await setAuthToken(userToken);
    return response;
  } catch (error) {
    console.error('Error joining trip:', error);
    return NextResponse.json(
      { error: 'Failed to join trip' },
      { status: 500 }
    );
  }
}
