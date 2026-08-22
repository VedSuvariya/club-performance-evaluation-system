import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '@/lib/validation/env';

describe('Environment Variables Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env variables before each test
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    // Restore env variables
    process.env = originalEnv;
  });

  it('should throw an error if environment variables are missing', () => {
    expect(() => validateEnv()).toThrow('[Env Validation Error]');
  });

  it('should throw an error if NEXT_PUBLIC_SUPABASE_URL is not a valid URL', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-anon-key';
    expect(() => validateEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
  });

  it('should return validated variables if they are correct', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key';
    const result = validateEnv();
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(result.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('valid-anon-key');
  });
});
