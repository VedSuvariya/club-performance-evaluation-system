/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { requireRole } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/database/server';
import {
  getCurrentMembership,
  getAvailableClubs,
  createTransferRequest,
} from '@/lib/database/club-transfers';
import {
  requestTransferAction,
  reviewTransferAction,
} from '@/features/club-transfer/actions';

// Mock Supabase Server Client
vi.mock('@/lib/database/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  requireRole: vi.fn(),
}));

// Mock next/cache revalidation to bypass next.js static generation errors in unit tests
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Club Transfer backend and workflow rules', () => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
  };

  const createMockQuery = (data: any, error: any = null) => {
    const chain: any = {};
    const returnChain = () => chain;
    chain.select = returnChain;
    chain.insert = returnChain;
    chain.eq = returnChain;
    chain.neq = returnChain;
    chain.order = returnChain;
    chain.single = vi.fn().mockResolvedValue({ data, error });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
    chain.then = (onfulfilled: any) => Promise.resolve({ data, error }).then(onfulfilled);
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);
    mockFrom.mockImplementation(() => createMockQuery([]));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  // 1. Get current active membership
  it('should retrieve current active membership details correctly', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'memberships') {
        return createMockQuery({
          id: 'membership-111',
          user_id: 'member-111',
          club_id: 'club-111',
          status: 'ACTIVE',
          joined_at: '2026-08-22',
          club: { name: 'GDSC' },
        });
      }
      return createMockQuery([]);
    });

    const membership = await getCurrentMembership('member-111');
    expect(membership).not.toBeNull();
    expect(membership?.clubName).toBe('GDSC');
    expect(membership?.clubId).toBe('club-111');
  });

  // 2. Fetch available clubs (excludes current club)
  it('should list available active clubs excluding current club', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'clubs') {
        return createMockQuery([
          { id: 'club-222', name: 'ACM', description: 'Coding club' },
        ]);
      }
      return createMockQuery([]);
    });

    const clubs = await getAvailableClubs('club-111');
    expect(clubs).toHaveLength(1);
    expect(clubs[0].id).toBe('club-222');
  });

  // 3. Prevent duplicate pending requests
  it('should reject creating a transfer request when there is already a pending request', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'club_transfer_requests') {
        // Return existing pending request
        return createMockQuery({ id: 'existing-request-id', status: 'PENDING' });
      }
      return createMockQuery([]);
    });

    await expect(
      createTransferRequest('member-111', 'club-111', 'club-222', 'Transfer reason text.')
    ).rejects.toThrow('DUPLICATE_PENDING_REQUEST');
  });

  // 4. Reject current club as target club
  it('should reject creating a transfer request if target club matches current club', async () => {
    await expect(
      createTransferRequest('member-111', 'club-111', 'club-111', 'Transfer reason text.')
    ).rejects.toThrow('TARGET_CLUB_IS_CURRENT_CLUB');
  });

  // 5. Submit request successfully
  it('should create transfer request when all rules pass', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'club_transfer_requests') {
        // First call: check for pending (returns null)
        // Second call: insert new request
        const queryChain = createMockQuery(null);
        queryChain.insert = () => createMockQuery({
          id: 'request-111',
          user_id: 'member-111',
          current_club_id: 'club-111',
          new_club_id: 'club-222',
          status: 'PENDING',
          reason: 'I want to write tests.',
          comments: '',
          decided_by: null,
          decided_at: null,
          created_at: '2026-08-23',
          current_club: { name: 'GDSC' },
          new_club: { name: 'ACM' },
        });
        return queryChain;
      }
      if (table === 'clubs') {
        // Verify target club active
        return createMockQuery({ id: 'club-222', is_active: true });
      }
      return createMockQuery([]);
    });

    const request = await createTransferRequest(
      'member-111',
      'club-111',
      'club-222',
      'I want to write tests.'
    );
    expect(request.id).toBe('request-111');
    expect(request.status).toBe('PENDING');
  });

  // 6. Member can submit a transfer request via server action
  it('should allow MEMBER to submit a transfer request via server action', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-111', role: 'MEMBER' });

    mockFrom.mockImplementation((table) => {
      if (table === 'memberships') {
        return createMockQuery({ club_id: 'club-111', status: 'ACTIVE' });
      }
      if (table === 'clubs') {
        return createMockQuery({ id: 'club-222', is_active: true });
      }
      if (table === 'club_transfer_requests') {
        const queryChain = createMockQuery(null);
        queryChain.insert = () => createMockQuery({
          id: 'request-111',
          status: 'PENDING',
          current_club_id: 'club-111',
          new_club_id: 'club-222',
        });
        return queryChain;
      }
      return createMockQuery([]);
    });

    const formData = new FormData();
    formData.append('targetClubId', '550e8400-e29b-41d4-a716-446655440002');
    formData.append('reason', 'This is a long enough transfer reason for testing.');

    const res = await requestTransferAction(null, formData);
    expect(res.success).toBe(true);
  });

  // 7. Non-member cannot request a transfer
  it('should reject transfer requests from non-MEMBER roles', async () => {
    (requireRole as any).mockRejectedValue(new Error('UNAUTHORIZED'));

    const formData = new FormData();
    formData.append('targetClubId', '550e8400-e29b-41d4-a716-446655440002');
    formData.append('reason', 'Short reason.');

    const res = await requestTransferAction(null, formData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Unauthorized');
  });

  // 8. Authorized President can approve request
  it('should invoke approve RPC transaction when Club President approves request', async () => {
    (requireRole as any).mockResolvedValue({ id: 'president-111', role: 'CLUB_PRESIDENT' });

    await reviewTransferAction(null, {
      requestId: '550e8400-e29b-41d4-a716-446655440001',
      action: 'APPROVE',
    });

    expect(mockRpc).toHaveBeenCalledWith('approve_club_transfer', {
      p_request_id: '550e8400-e29b-41d4-a716-446655440001',
      p_reviewer_id: 'president-111',
    });
  });

  // 9. Authorized President can reject request
  it('should invoke reject RPC when Club President rejects request with comments', async () => {
    (requireRole as any).mockResolvedValue({ id: 'president-111', role: 'CLUB_PRESIDENT' });

    await reviewTransferAction(null, {
      requestId: '550e8400-e29b-41d4-a716-446655440001',
      action: 'REJECT',
      comments: 'Rejecting this transfer request.',
    });

    expect(mockRpc).toHaveBeenCalledWith('reject_club_transfer', {
      p_request_id: '550e8400-e29b-41d4-a716-446655440001',
      p_reviewer_id: 'president-111',
      p_comments: 'Rejecting this transfer request.',
    });
  });

  // 10. Unauthorized roles cannot approve requests
  it('should prevent non-CLUB_PRESIDENT roles from reviewing requests', async () => {
    (requireRole as any).mockRejectedValue(new Error('UNAUTHORIZED'));

    const res = await reviewTransferAction(null, {
      requestId: '550e8400-e29b-41d4-a716-446655440001',
      action: 'APPROVE',
    });

    expect(res.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
