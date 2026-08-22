import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a non-empty string'),
});

export function validateEnv() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, val]) => `  - ${key}: ${val?.join(', ')}`)
      .join('\n');
    throw new Error(
      `\n[Env Validation Error] Missing or invalid environment variables:\n${errorMessages}\n\nPlease check your .env.local file. If you have not created it yet, copy .env.example to .env.local and configure the values.`
    );
  }

  return result.data;
}
