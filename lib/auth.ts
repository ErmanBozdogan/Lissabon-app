import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { getUserByToken } from './data';

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

export const getCurrentUser = async (request?: Request) => {
  const token = await getAuthToken(request);
  if (!token) return null;
  return getUserByToken(token);
};

export const clearAuth = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
};
