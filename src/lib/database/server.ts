import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateEnv } from '../validation/env';

/**
 * Creates a Supabase client for server-side environments (Server Components,
 * Server Actions, and Route Handlers) with automatic cookie handling.
 */
export async function createSupabaseServerClient() {
  const env = validateEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be safely ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
