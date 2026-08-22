/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { requireRole } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/database/server';
import {
  createEvaluation,
  getEvaluationDetail,
  getMemberEvaluations,
} from '@/lib/database/evaluations';
import { submitEvaluationAction } from '@/features/evaluation/actions';
import { getLeadClub } from '@/lib/database/department-lead';

// Mock Supabase Server Client
vi.mock('@/lib/database/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  requireRole: vi.fn(),
}));

// Mock department lead database helper
vi.mock('@/lib/database/department-lead', () => ({
  getLeadClub: vi.fn(),
}));

describe('Step 8 Member Work Evaluation Backend Rules', () => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    from: mockFrom,
  };

  // Fluent chain helper for mock queries
  const createMockQuery = (data: any, error: any = null) => {
    const chain: any = {};
    const returnChain = () => chain;
    chain.select = returnChain;
    chain.insert = returnChain;
    chain.eq = returnChain;
    chain.in = returnChain;
    chain.order = returnChain;
    chain.single = vi.fn().mockResolvedValue({ data, error });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
    chain.then = (onfulfilled: any) => Promise.resolve({ data, error }).then(onfulfilled);
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);
    mockFrom.mockImplementation(() => createMockQuery(null));
  });

  // Rule 1: Department Lead can evaluate completed work in their club
  it('should allow Department Lead to evaluate completed work in their club', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery({ club_id: 'club-1111' });
      }
      if (table === 'memberships') {
        return createMockQuery({ user_id: 'member-1111' });
      }
      if (table === 'task_completions') {
        return createMockQuery({ id: 'comp-1111' });
      }
      if (table === 'evaluations') {
        return createMockQuery({ id: 'eval-1111', rating: 5 });
      }
      return createMockQuery(null);
    });

    const result = await createEvaluation(
      'club-1111',
      'lead-1111', // evaluator
      'task-1111',
      'member-1111', // member
      5,
      'Great work!'
    );

    expect(result).toBeDefined();
    expect(result.rating).toBe(5);
  });

  // Rule 2: Department Lead cannot evaluate work from another club
  it('should reject evaluation if the task belongs to another club', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery({ club_id: 'club-2222' }); // Other club
      }
      return createMockQuery(null);
    });

    await expect(
      createEvaluation(
        'club-1111', // Authorized club
        'lead-1111',
        'task-1111',
        'member-1111',
        5,
        'Great work!'
      )
    ).rejects.toThrow('UNAUTHORIZED_TASK');
  });

  // Rule 3: Department Lead cannot evaluate work of a member in another club
  it('should reject evaluation if the member belongs to another club', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery({ club_id: 'club-1111' });
      }
      if (table === 'memberships') {
        // Not found or not active in club-1111
        return createMockQuery(null);
      }
      return createMockQuery(null);
    });

    await expect(
      createEvaluation(
        'club-1111',
        'lead-1111',
        'task-1111',
        'member-2222', // other member
        5,
        'Great work!'
      )
    ).rejects.toThrow('UNAUTHORIZED_MEMBER');
  });

  // Rule 4: Department Lead cannot evaluate incomplete work
  it('should reject evaluation if the task completion does not exist', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery({ club_id: 'club-1111' });
      }
      if (table === 'memberships') {
        return createMockQuery({ user_id: 'member-1111' });
      }
      if (table === 'task_completions') {
        // Completion does not exist
        return createMockQuery(null);
      }
      return createMockQuery(null);
    });

    await expect(
      createEvaluation(
        'club-1111',
        'lead-1111',
        'task-1111',
        'member-1111',
        5,
        'Great work!'
      )
    ).rejects.toThrow('COMPLETION_NOT_FOUND');
  });

  // Rule 5: Department Lead cannot evaluate themselves (Self-evaluation check)
  it('should reject self-evaluation', async () => {
    await expect(
      createEvaluation(
        'club-1111',
        'lead-1111', // evaluator
        'task-1111',
        'lead-1111', // member is also lead-1111
        5,
        'Great work!'
      )
    ).rejects.toThrow('SELF_EVALUATION_FORBIDDEN');
  });

  // Rule 6: Member cannot call the evaluation Server Action or submit rating
  it('should reject Server Action calls from users who are not Department Leads', async () => {
    (requireRole as any).mockRejectedValue(new Error('UNAUTHORIZED'));

    const result = await submitEvaluationAction(null, {
      taskId: 'task-1111',
      memberId: 'member-1111',
      rating: 5,
      feedback: 'Great job!',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized access.');
  });

  // Rule 7: Server action should reject ratings outside 1-5 scale
  it('should validate ratings boundary scale (1-5)', async () => {
    (requireRole as any).mockResolvedValue({ id: 'lead-1111', role: 'DEPARTMENT_LEAD' });
    (getLeadClub as any).mockResolvedValue({ id: 'club-1111' });

    const result = await submitEvaluationAction(null, {
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      memberId: '550e8400-e29b-41d4-a716-446655440001',
      rating: 6, // Invalid rating
      feedback: 'Invalide!',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Rating cannot be more than 5.');
  });

  // Rule 8: Server action should handle duplicate evaluation error gracefully
  it('should return helpful message on duplicate evaluation constraint breach', async () => {
    (requireRole as any).mockResolvedValue({ id: 'lead-1111', role: 'DEPARTMENT_LEAD' });
    (getLeadClub as any).mockResolvedValue({ id: 'club-1111' });

    // Mock DB unique violation
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') return createMockQuery({ club_id: 'club-1111' });
      if (table === 'memberships') return createMockQuery({ user_id: 'member-1111' });
      if (table === 'task_completions') return createMockQuery({ id: 'comp-1111' });
      if (table === 'evaluations') {
        const errObj = new Error('duplicate key value violates unique constraint');
        (errObj as any).code = '23505';
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.reject(errObj),
            }),
          }),
        } as any;
      }
      return createMockQuery(null);
    });

    const result = await submitEvaluationAction(null, {
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      memberId: '550e8400-e29b-41d4-a716-446655440001',
      rating: 4,
      feedback: 'Nice job!',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('This work has already been evaluated.');
  });

  // Rule 9: Member can view only their own evaluations
  it('should query only evaluations matching the member id', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'evaluations') {
        return createMockQuery([
          {
            id: 'eval-1111',
            task_id: 'task-1111',
            rating: 4,
            feedback: 'Good work',
            created_at: '2026-08-22',
            evaluator: { full_name: 'Lead Name' },
          },
        ]);
      }
      if (table === 'tasks') {
        return createMockQuery([{ id: 'task-1111', title: 'Task Title' }]);
      }
      if (table === 'task_completions') {
        return createMockQuery([{ task_id: 'task-1111', submitted_at: '2026-08-22' }]);
      }
      return createMockQuery([]);
    });

    const evals = await getMemberEvaluations('member-1111');
    expect(evals).toHaveLength(1);
    expect(evals[0].rating).toBe(4);
    expect(evals[0].evaluatorName).toBe('Lead Name');
  });

  // Rule 10: URL tampering or cross-club page access is rejected server-side
  it('should return null for evaluation detail if task belongs to a different club', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        // Querying task-1111 with club-2222 should return null because club-1111 lead does not own it
        return createMockQuery(null);
      }
      return createMockQuery(null);
    });

    const detail = await getEvaluationDetail('club-2222', 'task-1111', 'member-1111');
    expect(detail).toBeNull();
  });
});
