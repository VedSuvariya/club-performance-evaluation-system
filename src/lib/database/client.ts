import { createBrowserClient } from '@supabase/ssr';
import { validateEnv } from '../validation/env';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase client for browser-side interactions.
 * This client is safe to use in Client Components.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const env = validateEnv();
  browserClient = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return browserClient;
}
