/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createSupabaseServerClient } from '@/lib/database/server';
import {
  getMemberPerformanceSummary,
  getClubMembersPerformanceList,
  getMemberClubPerformanceDetails,
} from '@/lib/database/performance';

// Mock Supabase Server Client
vi.mock('@/lib/database/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('Step 9 Performance Aggregation Unit Tests', () => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    from: mockFrom,
  };

  // Fluent chain helper for mock queries
  const createMockQuery = (data: any, error: any = null) => {
    const chain: any = {};
    const returnChain = () => chain;
    chain.select = returnChain;
    chain.eq = returnChain;
    chain.in = returnChain;
    chain.order = returnChain;
    chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
    chain.single = vi.fn().mockResolvedValue({ data, error });
    chain.then = (onfulfilled: any) => {
      const count = Array.isArray(data) ? data.length : (data !== null ? 1 : 0);
      return Promise.resolve({ data, error, count }).then(onfulfilled);
    };
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);
    mockFrom.mockImplementation(() => createMockQuery([]));
  });

  describe('getMemberPerformanceSummary', () => {
    it('should compute zero values when member has no assignments', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'task_assignments') return createMockQuery([]);
        if (table === 'task_completions') return createMockQuery([]);
        if (table === 'evaluations') return createMockQuery([]);
        return createMockQuery([]);
      });

      const summary = await getMemberPerformanceSummary('member-1');
      expect(summary.totalAssigned).toBe(0);
      expect(summary.totalCompleted).toBe(0);
      expect(summary.totalEvaluated).toBe(0);
      expect(summary.pendingEvaluations).toBe(0);
      expect(summary.completionRate).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.recentEvaluations).toHaveLength(0);
      expect(summary.trendData).toHaveLength(0);
    });

    it('should calculate accurate metrics and trend points', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'task_assignments') {
          return createMockQuery([
            { task_id: 'task-1' },
            { task_id: 'task-2' },
            { task_id: 'task-3' },
          ]);
        }
        if (table === 'task_completions') {
          return createMockQuery([
            { id: 'comp-1', task_id: 'task-1' },
            { id: 'comp-2', task_id: 'task-2' },
          ]);
        }
        if (table === 'evaluations') {
          return createMockQuery([
            {
              id: 'eval-2',
              rating: 5,
              feedback: 'Perfect!',
              created_at: '2026-08-21T10:00:00Z',
              evaluator: { full_name: 'Lead Alice' },
              task: { title: 'Task Two' },
            },
            {
              id: 'eval-1',
              rating: 4,
              feedback: 'Good work',
              created_at: '2026-08-20T10:00:00Z',
              evaluator: { full_name: 'Lead Alice' },
              task: { title: 'Task One' },
            },
          ]);
        }
        return createMockQuery([]);
      });

      const summary = await getMemberPerformanceSummary('member-1');
      expect(summary.totalAssigned).toBe(3);
      expect(summary.totalCompleted).toBe(2);
      expect(summary.totalEvaluated).toBe(2);
      expect(summary.pendingEvaluations).toBe(0);
      expect(summary.completionRate).toBe(67); // round(2/3 * 100)
      expect(summary.averageRating).toBe(4.5); // (4 + 5) / 2
      expect(summary.recentEvaluations).toHaveLength(2);
      expect(summary.trendData).toHaveLength(2);
      expect(summary.trendData[0].rating).toBe(4);
      expect(summary.trendData[1].rating).toBe(5);
    });
  });

  describe('getClubMembersPerformanceList', () => {
    it('should aggregate metrics correctly for club members', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'memberships') {
          return createMockQuery([
            {
              joined_at: '2026-08-01T00:00:00Z',
              user: {
                id: 'member-1',
                full_name: 'Bob',
                email: 'bob@example.com',
              },
            },
          ]);
        }
        if (table === 'tasks') {
          return createMockQuery([
            { id: 'task-1', club_id: 'club-1' },
          ]);
        }
        if (table === 'task_assignments') {
          return createMockQuery([
            { user_id: 'member-1', task_id: 'task-1' },
          ]);
        }
        if (table === 'task_completions') {
          return createMockQuery([
            { user_id: 'member-1', task_id: 'task-1' },
          ]);
        }
        if (table === 'evaluations') {
          return createMockQuery([
            {
              id: 'eval-1',
              rating: 4,
              member_id: 'member-1',
            },
          ]);
        }
        return createMockQuery([]);
      });

      const list = await getClubMembersPerformanceList('club-1');
      expect(list).toHaveLength(1);
      expect(list[0].fullName).toBe('Bob');
      expect(list[0].assignedCount).toBe(1);
      expect(list[0].completedCount).toBe(1);
      expect(list[0].completionRate).toBe(100);
      expect(list[0].averageRating).toBe(4);
    });
  });

  describe('getMemberClubPerformanceDetails', () => {
    it('should return null if the member has no membership in the specified club', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'memberships') {
          // No membership found
          return createMockQuery(null);
        }
        return createMockQuery([]);
      });

      const details = await getMemberClubPerformanceDetails('club-1', 'member-1');
      expect(details).toBeNull();
    });

    it('should return member performance details when active membership is found', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'memberships') {
          return createMockQuery({
            joined_at: '2026-08-01T00:00:00Z',
            user: {
              id: 'member-1',
              full_name: 'Bob',
              email: 'bob@example.com',
            },
          });
        }
        if (table === 'tasks') {
          return createMockQuery([
            { id: 'task-1', title: 'Task One', club_id: 'club-1', created_at: '2026-08-05T00:00:00Z', due_date: null },
          ]);
        }
        if (table === 'task_assignments') {
          return createMockQuery([
            { task_id: 'task-1', assigned_at: '2026-08-05T00:00:00Z' },
          ]);
        }
        if (table === 'task_completions') {
          return createMockQuery([
            { id: 'comp-1', task_id: 'task-1', user_id: 'member-1', status: 'APPROVED', submitted_at: '2026-08-06T00:00:00Z', notes: 'Done' },
          ]);
        }
        if (table === 'evaluations') {
          return createMockQuery([
            {
              id: 'eval-1',
              task_id: 'task-1',
              rating: 5,
              feedback: 'Amazing job',
              created_at: '2026-08-07T00:00:00Z',
              evaluator: { full_name: 'Lead Alice' },
            },
          ]);
        }
        return createMockQuery([]);
      });

      const details = await getMemberClubPerformanceDetails('club-1', 'member-1');
      expect(details).not.toBeNull();
      expect(details?.member.fullName).toBe('Bob');
      expect(details?.metrics.completionRate).toBe(100);
      expect(details?.metrics.averageRating).toBe(5);
      expect(details?.taskHistory).toHaveLength(1);
      expect(details?.taskHistory[0].title).toBe('Task One');
      expect(details?.taskHistory[0].evaluation?.rating).toBe(5);
    });
  });
});
