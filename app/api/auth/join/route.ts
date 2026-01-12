import { NextRequest, NextResponse } from 'next/server';
import { addUser, getTripData } from '@/lib/data';
import { setAuthToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const TRIP_PASSWORD = 'Mighylisbon2026';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();


    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required' },
        { status: 400 }
      );
    }
    



    // Verify password
    if (password.trim() !== TRIP_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    

    const tripData = getTripData();

    // Check if user already exists
    const existingUser = tripData.users.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (existingUser) {
      // Return existing user
      const response = NextResponse.json({ user: existingUser });
      await setAuthToken(existingUser.token);
      return response;
    }

    // Create new user
    const userToken = uuidv4();
    const user = addUser(name, userToken);

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
