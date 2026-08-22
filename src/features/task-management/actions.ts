'use server';

import { requireRole } from '@/lib/permissions';
import {
  getMemberTasks,
  getMemberTaskDetail,
  createMemberTaskCompletion,
} from '@/lib/database/tasks';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Input Validation Schemas
const completeTaskSchema = z.object({
  taskId: z.string().uuid({ message: 'Invalid task ID format.' }),
  notes: z.string().max(500, { message: 'Notes must be less than 500 characters.' }),
});

export type ActionState = {
  success: boolean;
  error?: string;
};

/**
 * Fetches all tasks assigned to the current authenticated member.
 */
export async function getMemberTasksAction() {
  const user = await requireRole('MEMBER');
  return getMemberTasks(user.id);
}

/**
 * Fetches single task assignment detail verifying ownership.
 */
export async function getMemberTaskDetailAction(taskId: string) {
  const user = await requireRole('MEMBER');
  
  // Validate ID format
  const parsedId = z.string().uuid().safeParse(taskId);
  if (!parsedId.success) {
    return null;
  }

  return getMemberTaskDetail(user.id, taskId);
}

/**
 * Server Action to submit task completion.
 */
export async function completeTaskAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    // 1. Authenticate and enforce MEMBER role
    const user = await requireRole('MEMBER');

    // 2. Validate input format
    const rawTaskId = formData.get('taskId')?.toString();
    const rawNotes = formData.get('notes')?.toString() || '';

    const validation = completeTaskSchema.safeParse({
      taskId: rawTaskId,
      notes: rawNotes,
    });

    if (!validation.success) {
      const errorMsg = validation.error.issues.map((issue) => issue.message).join(' ');
      return { success: false, error: errorMsg };
    }

    const { taskId, notes } = validation.data;

    // 3. Verify task assignment ownership server-side
    const taskDetails = await getMemberTaskDetail(user.id, taskId);
    if (!taskDetails) {
      return { success: false, error: 'Task assignment not found.' };
    }

    // 4. Confirm task can be completed according to current completion status
    if (taskDetails.completion) {
      return { success: false, error: 'Task is already completed or submitted.' };
    }

    // 5. Insert completion record (atomic submission)
    await createMemberTaskCompletion(user.id, taskId, notes);

    // 6. Revalidate cache paths to update status immediately
    revalidatePath('/member');
    revalidatePath(`/member/tasks`);
    revalidatePath(`/member/tasks/${taskId}`);

    return { success: true };
  } catch (err) {
    // Do not leak internal/database error messages
    if (err instanceof Error && (err.message === 'UNAUTHENTICATED' || err.message === 'UNAUTHORIZED')) {
      return { success: false, error: 'Unauthorized access.' };
    }
    return { success: false, error: 'An unexpected database error occurred.' };
  }
}
