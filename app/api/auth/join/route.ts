import { NextRequest, NextResponse } from 'next/server';
import { setAuthToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Password-based authentication endpoint (Stateless for Vercel serverless)
 * 
 * Flow:
 * 1. Receives: { name: string, password: string } from frontend
 * 2. Validates password using password.trim() === TRIP_PASSWORD
 * 3. Generates a user object with token (stateless - no persistence)
 * 4. Sets auth token cookie and returns user with token
 * 
 * IMPORTANT: 
 * - Do not add inviteToken or any other fields to this endpoint.
 * - The frontend sends exactly { name, password } and nothing else.
 * - This is stateless - no filesystem or shared state is used.
 * - Users are not persisted (temporary fix for Vercel serverless).
 */
const TRIP_PASSWORD = 'Alpay';

export async function POST(request: NextRequest) {
  try {
    // Extract exactly: { name: string, password: string }
    // No other fields should be expected or processed
    const requestBody = await request.json();
    const { name, password } = requestBody;
    
    // DEBUG: Log received request body
    console.log('BACKEND RECEIVED:', JSON.stringify(requestBody));
    console.log('Backend details:', { 
      name, 
      nameType: typeof name,
      nameIsUndefined: name === undefined,
      nameIsNull: name === null,
      nameLength: name?.length,
      password, 
      passwordType: typeof password,
      passwordIsUndefined: password === undefined,
      passwordIsNull: password === null,
      passwordLength: password?.length,
      TRIP_PASSWORD,
      passwordMatches: password?.trim() === TRIP_PASSWORD
    });

    // Validate required fields
    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required' },
        { status: 400 }
      );
    }

    // Validate password - use trim() to match frontend trimming
    // This ensures consistent validation on both sides
    const trimmedPassword = password.trim();
    console.log('DEBUG: Password validation', {
      receivedPassword: password,
      trimmedPassword,
      TRIP_PASSWORD,
      matches: trimmedPassword === TRIP_PASSWORD,
      receivedLength: password?.length,
      trimmedLength: trimmedPassword.length,
      expectedLength: TRIP_PASSWORD.length
    });
    
    if (trimmedPassword !== TRIP_PASSWORD) {
      console.log('DEBUG: Password validation FAILED');
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    console.log('DEBUG: Password validation PASSED');

    // Generate user object (stateless - no filesystem or persistence)
    // This is a temporary fix for Vercel serverless functions
    const trimmedName = name.trim();
    const userToken = uuidv4();
    const userId = uuidv4();
    
    const user = {
      id: userId,
      name: trimmedName,
      token: userToken,
      joinedAt: new Date().toISOString(),
    };
    
    console.log('DEBUG: Generated user (stateless)', { 
      userId: user.id, 
      userName: user.name, 
      hasToken: !!user.token 
    });

    // Set auth token cookie and return user
    const response = NextResponse.json({ user });
    await setAuthToken(userToken);
    console.log('DEBUG: Response sent with user', { userToken: user.token });
    return response;
  } catch (error) {
    console.error('Error joining trip:', error);
    return NextResponse.json(
      { error: 'Failed to join trip' },
      { status: 500 }
    );
  }
}
