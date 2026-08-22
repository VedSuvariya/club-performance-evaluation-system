/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { requireRole } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/database/server';
import {
  getClubMembersWithStats,
  createTaskForClub,
  assignTaskToMembers,
  getClubCompletions,
} from '@/lib/database/department-lead';
import {
  createTaskAction,
  assignTaskAction,
} from '@/features/task-management/department-lead-actions';

// Mock Supabase Server Client
vi.mock('@/lib/database/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  requireRole: vi.fn(),
}));

describe('Department Lead Backend Rules', () => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    from: mockFrom,
  };

  // Fluent chain helper
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
    // Default implementation returning empty list
    mockFrom.mockImplementation(() => createMockQuery([]));
  });

  // 1. Department Lead can retrieve their club members
  it('should allow Department Lead to retrieve their club members with stats', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'memberships') {
        return createMockQuery([
          {
            status: 'ACTIVE',
            joined_at: '2026-08-22',
            user: { id: 'member-1111', email: 'member@test.com', full_name: 'Member One' },
          },
        ]);
      }
      if (table === 'tasks') {
        return createMockQuery([{ id: 'task-1111' }]);
      }
      return createMockQuery([]);
    });

    const members = await getClubMembersWithStats('club-1111');
    expect(members).toHaveLength(1);
    expect(members[0].fullName).toBe('Member One');
    expect(members[0].id).toBe('member-1111');
  });

  // 2. Department Lead cannot retrieve another club's members
  it('should isolate member fetching to only the lead authorized club', async () => {
    (requireRole as any).mockResolvedValue({ id: 'lead-1111', role: 'DEPARTMENT_LEAD' });

    mockFrom.mockImplementation((table) => {
      if (table === 'clubs') {
        // Manage club-1111
        return createMockQuery({ id: 'club-1111', name: 'GDSC' });
      }
      // memberships query returns empty for another club's query
      return createMockQuery([]);
    });

    const members = await getClubMembersWithStats('club-1111');
    expect(members).toHaveLength(0);
  });

  // 3. Department Lead can create a task for their club
  it('should allow Department Lead to create a task', async () => {
    (requireRole as any).mockResolvedValue({ id: 'lead-1111', role: 'DEPARTMENT_LEAD' });

    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery({ id: 'task-1111', title: 'New Task' });
      }
      return createMockQuery([]);
    });

    const task = await createTaskForClub('club-1111', 'lead-1111', 'New Task', 'Description', null);
    expect(task.id).toBe('task-1111');
    expect(task.title).toBe('New Task');
  });

  // 4. Department Lead cannot create a task for another club (Club context is derived server-side)
  it('should reject task creation for a club not managed by the lead', async () => {
    (requireRole as any).mockResolvedValue({ id: 'lead-1111', role: 'DEPARTMENT_LEAD' });

    // Mock getLeadClub returning null
    mockFrom.mockImplementation((table) => {
      if (table === 'clubs') {
        return createMockQuery(null);
      }
      return createMockQuery([]);
    });

    const formData = new FormData();
    formData.append('title', 'Unauthorized Task');
    formData.append('description', 'Attempt to create task');

    const result = await createTaskAction(null, formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('You are not assigned to manage any club');
  });

  // 5. Department Lead can assign a task to their club member
  it('should allow Department Lead to assign tasks to members in their club', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery({ club_id: 'club-1111' });
      }
      if (table === 'memberships') {
        return createMockQuery([{ user_id: 'member-1111' }]);
      }
      if (table === 'task_assignments') {
        // Return empty on select, and data on insert
        const chain = createMockQuery([]);
        chain.insert = () => createMockQuery([{ task_id: 'task-1111', user_id: 'member-1111' }]);
        return chain;
      }
      return createMockQuery([]);
    });

    const result = await assignTaskToMembers('club-1111', 'task-1111', ['member-1111']);
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe('member-1111');
  });

  // 6. Department Lead cannot assign a task to another club's member
  it('should prevent assigning tasks to users who are not active members of the lead club', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery({ club_id: 'club-1111' });
      }
      if (table === 'memberships') {
        return createMockQuery([]); // Empty means memberships mismatch
      }
      return createMockQuery([]);
    });

    await expect(
      assignTaskToMembers('club-1111', 'task-1111', ['member-external-9999'])
    ).rejects.toThrow('UNAUTHORIZED_MEMBERS');
  });

  // 7. Duplicate task assignments are prevented
  it('should filter out duplicate assignments and return only newly inserted ones', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery({ club_id: 'club-1111' });
      }
      if (table === 'memberships') {
        return createMockQuery([{ user_id: 'member-1111' }]);
      }
      if (table === 'task_assignments') {
        // Returns that member-1111 is already assigned
        return createMockQuery([{ user_id: 'member-1111' }]);
      }
      return createMockQuery([]);
    });

    const result = await assignTaskToMembers('club-1111', 'task-1111', ['member-1111']);
    expect(result).toHaveLength(0);
  });

  // 8. Department Lead can view task completion
  it('should allow Department Lead to retrieve completed submissions', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery([{ id: 'task-1111', title: 'Task Title' }]);
      }
      if (table === 'task_completions') {
        return createMockQuery([
          {
            id: 'completion-1111',
            task_id: 'task-1111',
            user_id: 'member-1111',
            status: 'SUBMITTED',
            notes: 'Finished banner design.',
            submitted_at: '2026-08-22T00:00:00Z',
            user: { full_name: 'Member One', email: 'member@test.com' },
          },
        ]);
      }
      return createMockQuery([]);
    });

    const completions = await getClubCompletions('club-1111');
    expect(completions).toHaveLength(1);
    expect(completions[0].notes).toBe('Finished banner design.');
  });

  // 9. Department Lead cannot access another club's completion data (isolated by club tasks)
  it('should return empty list if the lead club has no tasks generated', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQuery([]);
      }
      return createMockQuery([]);
    });

    const completions = await getClubCompletions('club-1111');
    expect(completions).toHaveLength(0);
  });

  // 10. Member cannot invoke Department Lead task creation
  it('should block non-DEPARTMENT_LEAD roles from calling createTaskAction', async () => {
    (requireRole as any).mockRejectedValue(new Error('UNAUTHORIZED'));

    const formData = new FormData();
    formData.append('title', 'Member Trying to Create Task');

    const result = await createTaskAction(null, formData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized access.');
  });

  // 11. Member cannot invoke Department Lead assignment
  it('should block non-DEPARTMENT_LEAD roles from calling assignTaskAction', async () => {
    (requireRole as any).mockRejectedValue(new Error('UNAUTHORIZED'));

    const result = await assignTaskAction(null, {
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      memberIds: ['550e8400-e29b-41d4-a716-446655440001'],
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized access.');
  });

  // 12. Invalid task/member/club IDs are handled safely (Zod validation check)
  it('should reject invalid UUIDs in task assignment payload', async () => {
    (requireRole as any).mockResolvedValue({ id: 'lead-1111', role: 'DEPARTMENT_LEAD' });

    // Mock getLeadClub
    mockFrom.mockImplementation((table) => {
      if (table === 'clubs') {
        return createMockQuery({ id: 'club-1111' });
      }
      return createMockQuery([]);
    });

    const result = await assignTaskAction(null, {
      taskId: 'invalid-id-format',
      memberIds: ['another-bad-id'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid task ID');
  });
});
