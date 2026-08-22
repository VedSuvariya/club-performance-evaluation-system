import { cache } from 'react';
import { createSupabaseServerClient } from '../database/server';

export type UserRole = 'MEMBER' | 'DEPARTMENT_LEAD' | 'CLUB_PRESIDENT' | 'STUDENT_WELFARE_COUNCIL';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves the current authenticated user and their database profile.
 * Cached per request using React cache to optimize performance and prevent duplicate database queries.
 */
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      return null;
    }

    return profile as UserProfile;
  } catch {
    return null;
  }
});

/**
 * Checks if the current user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Checks if the current user has a specific role.
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === role;
}

/**
 * Enforces that the current user has a specific role.
 * Throws an error if the user is unauthenticated or unauthorized.
 */
export async function requireRole(role: UserRole): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  if (user.role !== role) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Enforces that the current user has at least one of the specified roles.
 * Throws an error if the user is unauthenticated or unauthorized.
 */
export async function requireAnyRole(roles: UserRole[]): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  if (!roles.includes(user.role)) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
