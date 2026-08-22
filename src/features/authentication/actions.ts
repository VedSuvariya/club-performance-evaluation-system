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
 * Handles the user login authentication and redirects them to their designated dashboard.
 */
export async function loginAction(_prevState: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validate email and password inputs
  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  // Retrieve authenticated user's role profile to decide where to route them
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      if (profile.role === 'MEMBER') {
        redirect('/member');
      }
      if (profile.role === 'DEPARTMENT_LEAD') {
        redirect('/department-lead');
      }
      if (profile.role === 'CLUB_PRESIDENT') {
        redirect('/club-president');
      }
      if (profile.role === 'STUDENT_WELFARE_COUNCIL') {
        redirect('/swc');
      }
    }
  }

  redirect('/');
}

/**
 * Destroys the current user session and redirects to the login screen.
 */
export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
