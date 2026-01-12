import { cookies } from 'next/headers';
import { headers } from 'next/headers';

/**
 * Stateless auth utilities for Vercel serverless
 * 
 * Authentication is based ONLY on presence of auth_token.
 * No user lookup or persistence is performed.
 * If token exists, user is considered authenticated.
 */

export const getAuthToken = async (request?: Request): Promise<string | null> => {
  // Try to get from Authorization header first (for client-side)
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }
  
  // Fall back to cookies
  try {
    const cookieStore = await cookies();
    return cookieStore.get('auth_token')?.value || null;
  } catch {
    // If cookies() fails (e.g., in middleware), try headers
    try {
      const headersList = await headers();
      const authHeader = headersList.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    } catch {
      return null;
    }
    return null;
  }
};

export const setAuthToken = async (token: string): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
};

/**
 * Stateless user authentication check
 * 
 * Returns a basic user object if token exists, null otherwise.
 * Does NOT look up users in database or filesystem.
 * This is client-trusting: if token exists, user is authenticated.
 * 
 * Note: User name is not stored server-side, so we return a generic name.
 * The client should store the name in localStorage during join.
 */
export const getCurrentUser = async (request?: Request) => {
  const token = await getAuthToken(request);
  if (!token) return null;
  
  // Stateless: return a basic user object based on token
  // The token itself is the authentication proof
  // We don't need to look up the user anywhere
  // Name will be provided by client from localStorage
  return {
    id: 'user', // Generic ID since we're stateless
    name: 'User', // Generic name - client should provide actual name from localStorage
    token: token,
    joinedAt: new Date().toISOString(),
  };
};

export const clearAuth = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
};
