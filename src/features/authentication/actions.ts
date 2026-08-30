'use server';

import { createSupabaseServerClient } from '@/lib/database/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export interface LoginState {
  success?: boolean;
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
  };
}

/**
 * Handles user login authentication and redirects
 * the user to their role-specific dashboard.
 */
export async function loginAction(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validate email and password
  const validation = loginSchema.safeParse({
    email,
    password,
  });

  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
    };
  }

  // Create Supabase server client
  const supabase = await createSupabaseServerClient();

  // Authenticate user with Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Authentication failed
  if (authError) {
    console.error('AUTHENTICATION ERROR:', authError);

    return {
      success: false,
      message: authError.message,
    };
  }

  // Make sure Supabase returned a user
  if (!user) {
    console.error('NO AUTHENTICATED USER RETURNED');

    return {
      success: false,
      message: 'Authentication succeeded but no user was returned.',
    };
  }

  // Retrieve the user's role from public.users
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Profile query failed
  if (profileError) {
    console.error('PROFILE LOOKUP ERROR:', profileError);

    return {
      success: false,
      message: `Profile lookup failed: ${profileError.message}`,
    };
  }

  // No profile exists
  if (!profile) {
    console.error('NO PROFILE FOUND FOR USER:', user.id);

    return {
      success: false,
      message: 'Your account exists, but no user profile was found.',
    };
  }

  // Log successful authentication and role
  console.log('LOGIN SUCCESS:', {
    id: user.id,
    email: user.email,
    role: profile.role,
  });

  // Redirect according to user role
  switch (profile.role) {
    case 'MEMBER':
      redirect('/member');

    case 'DEPARTMENT_LEAD':
      redirect('/department-lead');

    case 'CLUB_PRESIDENT':
      redirect('/club-president');

    case 'STUDENT_WELFARE_COUNCIL':
      redirect('/swc');

    default:
      console.error('UNKNOWN USER ROLE:', profile.role);

      return {
        success: false,
        message: `Unknown user role: ${profile.role}`,
      };
  }
}

/**
 * Destroys the current user session
 * and redirects to the login screen.
 */
export async function logoutAction() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect('/login');
}