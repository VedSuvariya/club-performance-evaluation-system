'use server';

import { requireRole } from '@/lib/permissions';
import {
  getLeadClub,
  getClubMembersWithStats,
  getMemberPerformanceDetails,
  createTaskForClub,
  assignTaskToMembers,
  getClubTasks,
  getClubCompletions,
} from '@/lib/database/department-lead';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Action state types
export type ActionState = {
  success: boolean;
  error?: string;
};

// Zod schemas
const createTaskSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100),
  description: z.string().max(1000, { message: 'Description must be less than 1000 characters.' }),
  dueDate: z.string().nullable().or(z.literal('')),
});

const assignTaskSchema = z.object({
  taskId: z.string().uuid({ message: 'Invalid task ID.' }),
  memberIds: z.array(z.string().uuid({ message: 'Invalid member ID.' })).min(1, { message: 'Select at least one member.' }),
});

/**
 * Creates a task for the Department Lead's club.
 */
export async function createTaskAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireRole('DEPARTMENT_LEAD');

    const club = await getLeadClub(user.id);
    if (!club) {
      return { success: false, error: 'You are not assigned to manage any club.' };
    }

    const rawTitle = formData.get('title')?.toString();
    const rawDescription = formData.get('description')?.toString() || '';
    const rawDueDate = formData.get('dueDate')?.toString() || null;

    const validation = createTaskSchema.safeParse({
      title: rawTitle,
      description: rawDescription,
      dueDate: rawDueDate,
    });

    if (!validation.success) {
      const errorMsg = validation.error.issues.map((issue) => issue.message).join(' ');
      return { success: false, error: errorMsg };
    }

    const { title, description, dueDate } = validation.data;

    await createTaskForClub(club.id, user.id, title, description, dueDate || null);

    revalidatePath('/department-lead');
    revalidatePath('/department-lead/tasks');

    return { success: true };
  } catch (err) {
    if (err instanceof Error && (err.message === 'UNAUTHENTICATED' || err.message === 'UNAUTHORIZED')) {
      return { success: false, error: 'Unauthorized access.' };
    }
    return { success: false, error: 'An unexpected database error occurred.' };
  }
}

/**
 * Assigns a task to one or more members.
 */
export async function assignTaskAction(
  _prevState: ActionState | null,
  payload: { taskId: string; memberIds: string[] }
): Promise<ActionState> {
  try {
    const user = await requireRole('DEPARTMENT_LEAD');

    const club = await getLeadClub(user.id);
    if (!club) {
      return { success: false, error: 'You are not assigned to manage any club.' };
    }

    const validation = assignTaskSchema.safeParse(payload);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map((issue) => issue.message).join(' ');
      return { success: false, error: errorMsg };
    }

    const { taskId, memberIds } = validation.data;

    await assignTaskToMembers(club.id, taskId, memberIds);

    revalidatePath('/department-lead');
    revalidatePath('/department-lead/tasks');
    revalidatePath('/department-lead/members');

    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHENTICATED' || err.message === 'UNAUTHORIZED') {
        return { success: false, error: 'Unauthorized access.' };
      }
      if (err.message === 'UNAUTHORIZED_TASK') {
        return { success: false, error: 'The requested task does not belong to your club.' };
      }
      if (err.message === 'UNAUTHORIZED_MEMBERS') {
        return { success: false, error: 'One or more selected members do not belong to your club.' };
      }
    }
    return { success: false, error: 'An unexpected database error occurred.' };
  }
}

/**
 * Fetches all members for the lead's club.
 */
export async function getClubMembersAction() {
  const user = await requireRole('DEPARTMENT_LEAD');
  const club = await getLeadClub(user.id);
  if (!club) return [];
  return getClubMembersWithStats(club.id);
}

/**
 * Fetches all tasks for the lead's club.
 */
export async function getClubTasksAction() {
  const user = await requireRole('DEPARTMENT_LEAD');
  const club = await getLeadClub(user.id);
  if (!club) return [];
  return getClubTasks(club.id);
}

/**
 * Fetches completion logs/list.
 */
export async function getClubCompletionsAction() {
  const user = await requireRole('DEPARTMENT_LEAD');
  const club = await getLeadClub(user.id);
  if (!club) return [];
  return getClubCompletions(club.id);
}

/**
 * Fetches details of a single member.
 */
export async function getMemberPerformanceAction(memberId: string) {
  const user = await requireRole('DEPARTMENT_LEAD');
  const club = await getLeadClub(user.id);
  if (!club) return null;

  // Validate ID format
  const parsedId = z.string().uuid().safeParse(memberId);
  if (!parsedId.success) {
    return null;
  }

  return getMemberPerformanceDetails(club.id, memberId);
}
