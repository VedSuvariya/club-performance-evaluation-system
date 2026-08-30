/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { requireRole } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/database/server';
import {
  getPresidentClub,
  getPresidentDashboardData,
} from '@/lib/database/club-president';
import {
  getSwcDashboardData,
  getSwcClubDetail,
} from '@/lib/database/swc';
import { getMemberClubPerformanceDetails } from '@/lib/database/performance';
import { reviewTransferAction } from '@/features/club-transfer/actions';

// Mock Supabase Server Client
vi.mock('@/lib/database/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  requireRole: vi.fn(),
}));

// Mock next/cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock the nested database calls from other files to simplify testing club-president and swc helpers
vi.mock('@/lib/database/evaluations', () => ({
  getPendingEvaluations: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/database/club-transfers', () => ({
  getPendingTransferRequests: vi.fn().mockResolvedValue([]),
  approveTransferRequest: vi.fn().mockResolvedValue(undefined),
  rejectTransferRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/database/reports', () => ({
  getClubSummaryStats: vi.fn().mockResolvedValue({
    memberCount: 5,
    totalAssigned: 10,
    totalCompleted: 8,
    completionRate: 80,
    averageRating: 4.5,
    evaluatedMembersCount: 4,
    recentEvaluations: [],
    membersList: [],
  }),
}));

describe('Administrative Workflows - Club President & SWC', () => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    from: mockFrom,
  };

  const createMockQuery = (data: any, error: any = null) => {
    const chain: any = {};
    const returnChain = () => chain;
    chain.select = returnChain;
    chain.insert = returnChain;
    chain.eq = returnChain;
    chain.in = returnChain;
    chain.or = returnChain;
    chain.order = returnChain;
    chain.limit = returnChain;
    chain.single = vi.fn().mockResolvedValue({ data, error });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
    chain.then = (onfulfilled: any) => Promise.resolve({ data, error }).then(onfulfilled);
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);
    mockFrom.mockImplementation(() => createMockQuery([]));
  });

  // 1. getPresidentClub tests
  describe('getPresidentClub', () => {
    it('should retrieve president managed club correctly', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'clubs') {
          return createMockQuery({
            id: 'club-111',
            name: 'Science Club',
            description: 'Tech & Science',
            department_lead: { id: 'lead-111', full_name: 'Lead Name', email: 'lead@test.com' },
          });
        }
        return createMockQuery(null);
      });

      const club = await getPresidentClub('president-111');
      expect(club).not.toBeNull();
      expect(club?.name).toBe('Science Club');
      expect(club?.departmentLead?.fullName).toBe('Lead Name');
    });

    it('should return null if president does not manage any club', async () => {
      mockFrom.mockImplementation(() => createMockQuery(null));
      const club = await getPresidentClub('president-222');
      expect(club).toBeNull();
    });
  });

  // 2. getPresidentDashboardData tests
  describe('getPresidentDashboardData', () => {
    it('should aggregate metrics and activity log correctly', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'memberships') {
          return createMockQuery([{ user_id: 'user-1' }, { user_id: 'user-2' }]);
        }
        if (table === 'tasks') {
          return createMockQuery([{ id: 'task-1', title: 'Task 1', status: 'OPEN' }]);
        }
        if (table === 'task_assignments') {
          return createMockQuery([{ user_id: 'user-1', task_id: 'task-1' }]);
        }
        if (table === 'task_completions') {
          return createMockQuery([{ user_id: 'user-1', task_id: 'task-1', status: 'APPROVED' }]);
        }
        if (table === 'evaluations') {
          return createMockQuery([{ rating: 5, created_at: '2026-08-23' }]);
        }
        return createMockQuery([]);
      });

      const stats = await getPresidentDashboardData('club-111');
      expect(stats.memberCount).toBe(2);
      expect(stats.activeTasksCount).toBe(1);
      expect(stats.completionRate).toBe(100);
      expect(stats.averageRating).toBe(5);
    });
  });

  // 3. getSwcDashboardData tests
  describe('getSwcDashboardData', () => {
    it('should aggregate system-wide stats correctly', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'clubs') {
          return createMockQuery([
            { id: 'club-1', is_active: true },
            { id: 'club-2', is_active: false },
          ]);
        }
        return createMockQuery([]);
      });

      const swcStats = await getSwcDashboardData();
      expect(swcStats.totalClubsCount).toBe(2);
      expect(swcStats.activeClubsCount).toBe(1);
    });
  });

  // 4. getClubsDirectoryData & getSwcClubDetail tests
  describe('getSwcClubDetail', () => {
    it('should retrieve detailed club stats for SWC audit', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'clubs') {
          return createMockQuery({
            id: 'club-111',
            name: 'Math Club',
            is_active: true,
            president: { id: 'pres-1', full_name: 'President Name', email: 'pres@test.com' },
          });
        }
        return createMockQuery(null);
      });

      const detail = await getSwcClubDetail('club-111');
      expect(detail).not.toBeNull();
      expect(detail?.name).toBe('Math Club');
      expect(detail?.president?.fullName).toBe('President Name');
      expect(detail?.memberCount).toBe(5);
    });
  });

  // 5. getMemberClubPerformanceDetails safety boundary tests
  describe('getMemberClubPerformanceDetails boundary validation', () => {
    it('should return null if member does not belong to the queried club', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'memberships') {
          // maybeSingle checks membership matches club_id AND user_id
          // Return null to simulate member is not in this club
          return createMockQuery(null);
        }
        return createMockQuery([]);
      });

      const performance = await getMemberClubPerformanceDetails('club-A', 'member-B');
      expect(performance).toBeNull();
    });
  });

  // 6. Action safety bounds for reviewTransferAction
  describe('reviewTransferAction secure checks', () => {
    const validUuid = 'a6f9b8c0-7f32-4d2b-9be0-1234567890ab';

    it('should reject review request if the President does not manage either target or current club of the transfer', async () => {
      (requireRole as any).mockResolvedValue({ id: 'president-111', role: 'CLUB_PRESIDENT' });

      mockFrom.mockImplementation((table) => {
        if (table === 'clubs') {
          // President manages club-111
          return createMockQuery({ id: 'club-111' });
        }
        if (table === 'club_transfer_requests') {
          // Request transfers member between club-222 and club-333 (neither belongs to president-111)
          return createMockQuery({
            current_club_id: 'club-222',
            new_club_id: 'club-333',
          });
        }
        return createMockQuery([]);
      });

      const res = await reviewTransferAction(null, {
        requestId: validUuid,
        action: 'APPROVE',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('You can only review transfers related to your club');
    });

    it('should approve review request if the President manages the target/current club', async () => {
      (requireRole as any).mockResolvedValue({ id: 'president-111', role: 'CLUB_PRESIDENT' });

      mockFrom.mockImplementation((table) => {
        if (table === 'clubs') {
          return createMockQuery({ id: 'club-111' });
        }
        if (table === 'club_transfer_requests') {
          // Transferring to club-111 which is managed by the president
          return createMockQuery({
            current_club_id: 'club-222',
            new_club_id: 'club-111',
          });
        }
        return createMockQuery([]);
      });

      const res = await reviewTransferAction(null, {
        requestId: validUuid,
        action: 'APPROVE',
      });

      expect(res.success).toBe(true);
    });
  });
});
