import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * Stateless auth check endpoint
 * 
 * Returns user object if auth_token exists (in cookie or Authorization header).
 * Does NOT look up users in database or filesystem.
 * This is client-trusting: presence of token = authenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Return the stateless user object
    // The token itself proves authentication
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
