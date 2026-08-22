import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getCurrentUser, requireRole, requireAnyRole, isAuthenticated, hasRole } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/database/server';
import { logoutAction, loginAction } from '@/features/authentication/actions';

// Mock Supabase Server Client
vi.mock('@/lib/database/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock Next.js Navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

describe('Authentication & Role-Based Access Control', () => {
  const mockGetUser = vi.fn();
  const mockSignOut = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockSignInWithPassword = vi.fn();

  const mockSupabase = {
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
      signInWithPassword: mockSignInWithPassword,
    },
    from: mockFrom,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);

    // Default chain flow mock setup
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  // Test 1: Unauthenticated user cannot access protected routes
  it('should deny access if user is unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const user = await getCurrentUser();
    expect(user).toBeNull();

    const authCheck = await isAuthenticated();
    expect(authCheck).toBe(false);

    await expect(requireRole('MEMBER')).rejects.toThrow('UNAUTHENTICATED');
  });

  // Test 2: MEMBER cannot access /department-lead
  it('should deny MEMBER from accessing DEPARTMENT_LEAD resources', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', email: 'member@test.com', role: 'MEMBER' },
      error: null,
    });

    const isLead = await hasRole('DEPARTMENT_LEAD');
    expect(isLead).toBe(false);

    await expect(requireRole('DEPARTMENT_LEAD')).rejects.toThrow('UNAUTHORIZED');
  });

  // Test 3: MEMBER cannot access /club-president
  it('should deny MEMBER from accessing CLUB_PRESIDENT resources', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', email: 'member@test.com', role: 'MEMBER' },
      error: null,
    });

    await expect(requireRole('CLUB_PRESIDENT')).rejects.toThrow('UNAUTHORIZED');
  });

  // Test 4: MEMBER cannot access /swc
  it('should deny MEMBER from accessing STUDENT_WELFARE_COUNCIL resources', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', email: 'member@test.com', role: 'MEMBER' },
      error: null,
    });

    await expect(requireRole('STUDENT_WELFARE_COUNCIL')).rejects.toThrow('UNAUTHORIZED');
  });

  // Test 5: DEPARTMENT_LEAD can access /department-lead
  it('should authorize DEPARTMENT_LEAD access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'lead-1' } }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: 'lead-1', email: 'lead@test.com', role: 'DEPARTMENT_LEAD' },
      error: null,
    });

    const isLead = await hasRole('DEPARTMENT_LEAD');
    expect(isLead).toBe(true);

    const profile = await requireRole('DEPARTMENT_LEAD');
    expect(profile.role).toBe('DEPARTMENT_LEAD');
  });

  // Test 6: CLUB_PRESIDENT can access /club-president
  it('should authorize CLUB_PRESIDENT access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'pres-1' } }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: 'pres-1', email: 'pres@test.com', role: 'CLUB_PRESIDENT' },
      error: null,
    });

    const isPres = await hasRole('CLUB_PRESIDENT');
    expect(isPres).toBe(true);

    const profile = await requireRole('CLUB_PRESIDENT');
    expect(profile.role).toBe('CLUB_PRESIDENT');
  });

  // Test 7: STUDENT_WELFARE_COUNCIL can access /swc
  it('should authorize STUDENT_WELFARE_COUNCIL access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'swc-1' } }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: 'swc-1', email: 'swc@test.com', role: 'STUDENT_WELFARE_COUNCIL' },
      error: null,
    });

    const isSwc = await hasRole('STUDENT_WELFARE_COUNCIL');
    expect(isSwc).toBe(true);

    const profile = await requireRole('STUDENT_WELFARE_COUNCIL');
    expect(profile.role).toBe('STUDENT_WELFARE_COUNCIL');
  });

  // Test 7.5: requireAnyRole matches if user has one of the specified roles
  it('should authorize access if user has one of the required roles in requireAnyRole', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'lead-1' } }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: 'lead-1', email: 'lead@test.com', role: 'DEPARTMENT_LEAD' },
      error: null,
    });

    const profile = await requireAnyRole(['DEPARTMENT_LEAD', 'CLUB_PRESIDENT']);
    expect(profile.role).toBe('DEPARTMENT_LEAD');

    await expect(requireAnyRole(['MEMBER', 'STUDENT_WELFARE_COUNCIL'])).rejects.toThrow('UNAUTHORIZED');
  });

  // Test 8: Users without a valid application role are denied protected access
  it('should deny access if user profile does not exist in public.users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'stranger-1' } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: new Error('User not found') });

    const user = await getCurrentUser();
    expect(user).toBeNull();

    await expect(requireRole('MEMBER')).rejects.toThrow('UNAUTHENTICATED');
  });

  // Test 9: Logout invalidates the authenticated session
  it('should perform signout and redirect on logout action', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await expect(logoutAction()).rejects.toThrow('REDIRECT:/login');
    expect(mockSignOut).toHaveBeenCalled();
  });

  // Test 10: Authentication errors are handled safely
  it('should return error message when login fails with invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const formData = new FormData();
    formData.append('email', 'wrong@test.com');
    formData.append('password', 'password123');

    const state = await loginAction(null, formData);
    expect(state.success).toBe(false);
    expect(state.message).toBe('Invalid login credentials');
  });
});
