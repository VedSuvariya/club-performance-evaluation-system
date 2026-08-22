/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { requireRole } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/database/server';
import {
  getMemberTasks,
  getMemberTaskDetail,
  createMemberTaskCompletion,
} from '@/lib/database/tasks';
import {
  getMemberTasksAction,
  getMemberTaskDetailAction,
  completeTaskAction,
} from '@/features/task-management/actions';
import * as actions from '@/features/task-management/actions';

// Mock Supabase Server Client
vi.mock('@/lib/database/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  requireRole: vi.fn(),
}));

describe('Member Task Management Backend Rules', () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockFrom = vi.fn();
  const mockInsert = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSingle = vi.fn();

  const mockSupabase = {
    from: mockFrom,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);

    // Setup standard fluent chaining
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    });
    mockInsert.mockReturnValue({
      select: mockInsert,
      single: mockSingle,
    });
  });

  // 1. Member can retrieve their assigned tasks
  it('should allow Member to retrieve their assigned tasks', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });
    
    mockSelect.mockImplementation((fields) => {
      if (fields.includes('task:tasks')) {
        return {
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                assigned_at: '2026-08-22',
                task: { id: 'task-1', title: 'Task 1', due_date: '2026-09-01', status: 'OPEN', club: { name: 'GDSC' } }
              }
            ],
            error: null
          })
        };
      }
      // Mock completions
      return {
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };
    });

    const tasks = await getMemberTasks('member-123');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].task.title).toBe('Task 1');
    expect(tasks[0].task.clubName).toBe('GDSC');
  });

  // 2. Member cannot retrieve another member's tasks
  it('should enforce user ID filtering so a member cannot retrieve another member tasks', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });

    const eqSpy = vi.fn().mockReturnValue({ data: [], error: null });
    mockSelect.mockReturnValue({ eq: eqSpy });

    await getMemberTasks('member-123');
    expect(eqSpy).toHaveBeenCalledWith('user_id', 'member-123');
  });

  // 3. Member can view their own task details
  it('should allow Member to view their own task details', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });

    const mockAssignment = {
      assigned_at: '2026-08-22',
      task: { id: 'task-1', title: 'Task 1', due_date: '2026-09-01', status: 'OPEN', club: { name: 'GDSC' } }
    };

    mockMaybeSingle.mockResolvedValueOnce({ data: mockAssignment, error: null }); // Assignment check
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // Completion check

    const details = await getMemberTaskDetail('member-123', 'task-1');
    expect(details).not.toBeNull();
    expect(details?.task.title).toBe('Task 1');
  });

  // 4. Member cannot view another member's task details
  it('should return null or deny access if a task is not assigned to the member', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const details = await getMemberTaskDetail('member-123', 'task-other');
    expect(details).toBeNull();
  });

  // 5. Member can complete an assigned incomplete task
  it('should allow a Member to complete an assigned incomplete task', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });

    mockSingle.mockResolvedValue({ data: { id: 'comp-1' }, error: null });

    const result = await createMemberTaskCompletion('member-123', 'task-1', 'Notes');
    expect(result).toBeDefined();
    expect(result.id).toBe('comp-1');
  });

  // 6. Member cannot complete another member's task (verified via Server Action checks)
  it('should reject completion if the task assignment is not found for the user', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });

    // Mock getMemberTaskDetail returning null (not assigned)
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const formData = new FormData();
    formData.append('taskId', 'da524021-ef77-47b2-9d32-cd219e4a3d6d');
    formData.append('notes', 'Completed');

    const result = await completeTaskAction(null, formData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Task assignment not found.');
  });

  // 7. Member cannot complete the same task twice
  it('should reject task completion if the task is already completed', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });

    // Mock getMemberTaskDetail returning a task with a completion record
    const mockAssignment = {
      assigned_at: '2026-08-22',
      task: { id: 'task-1', title: 'Task 1', due_date: '2026-09-01', status: 'OPEN', club: { name: 'GDSC' } }
    };
    const mockCompletion = { id: 'comp-1', status: 'SUBMITTED', notes: '', submitted_at: '2026-08-22' };

    mockMaybeSingle.mockResolvedValueOnce({ data: mockAssignment, error: null }); // Assignment
    mockMaybeSingle.mockResolvedValueOnce({ data: mockCompletion, error: null }); // Existing completion

    const formData = new FormData();
    formData.append('taskId', 'da524021-ef77-47b2-9d32-cd219e4a3d6d');
    formData.append('notes', 'Done');

    const result = await completeTaskAction(null, formData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Task is already completed or submitted.');
  });

  // 8. Member cannot create a task
  it('should not contain any task creation logic for members', () => {
    // Check that we only export retrieval and completion features
    expect(getMemberTasksAction).toBeDefined();
    expect(completeTaskAction).toBeDefined();
    // Verify that we do not export task creation actions
    expect((actions as any).createTaskAction).toBeUndefined();
    expect((actions as any).assignTaskAction).toBeUndefined();
  });

  // 9. Non-members cannot use Member task operations
  it('should throw an UNAUTHORIZED error for non-members in actions', async () => {
    (requireRole as any).mockImplementation((role: string) => {
      if (role === 'MEMBER') {
        throw new Error('UNAUTHORIZED');
      }
      return Promise.resolve({ id: 'lead-123', role: 'DEPARTMENT_LEAD' });
    });

    await expect(getMemberTasksAction()).rejects.toThrow('UNAUTHORIZED');
  });

  // 10. Invalid task IDs are handled safely
  it('should return null or validation failure for invalid UUID task IDs', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });

    const result = await getMemberTaskDetailAction('invalid-uuid');
    expect(result).toBeNull();
  });

  // 11. Database failures are handled safely
  it('should return a user-friendly generic error message on DB failure in actions', async () => {
    (requireRole as any).mockResolvedValue({ id: 'member-123', role: 'MEMBER' });

    // Mock assignment search throwing error
    mockMaybeSingle.mockRejectedValue(new Error('Internal connection pool timed out'));

    const formData = new FormData();
    formData.append('taskId', 'da524021-ef77-47b2-9d32-cd219e4a3d6d');
    formData.append('notes', 'Notes');

    const result = await completeTaskAction(null, formData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('An unexpected database error occurred.');
  });
});
