'use server';

import { requireRole } from '@/lib/permissions';
import { getLeadClub } from '@/lib/database/department-lead';
import { createEvaluation } from '@/lib/database/evaluations';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

export type ActionState = {
  success: boolean;
  error?: string;
};

const submitEvaluationSchema = z.object({
  taskId: z.string().uuid({ message: 'Invalid task ID.' }),
  memberId: z.string().uuid({ message: 'Invalid member ID.' }),
  rating: z.number().int().min(1, { message: 'Rating must be at least 1.' }).max(5, { message: 'Rating cannot be more than 5.' }),
  feedback: z.string().max(1000, { message: 'Feedback must be less than 1000 characters.' }),
});

/**
 * Submits an evaluation for a member's completed task.
 */
export async function submitEvaluationAction(
  _prevState: ActionState | null,
  payload: { taskId: string; memberId: string; rating: number; feedback: string }
): Promise<ActionState> {
  try {
    // 1. Authenticate user & require DEPARTMENT_LEAD role
    const user = await requireRole('DEPARTMENT_LEAD');

    // 2. Resolve evaluator's authorized club
    const club = await getLeadClub(user.id);
    if (!club) {
      return { success: false, error: 'You are not assigned to manage any club.' };
    }

    // 3. Validate rating, task UUID, and member UUID
    const validation = submitEvaluationSchema.safeParse(payload);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map((issue) => issue.message).join(' ');
      return { success: false, error: errorMsg };
    }

    const { taskId, memberId, rating, feedback } = validation.data;

    // 4. Create evaluation in database with lead/club validation checks
    await createEvaluation(club.id, user.id, taskId, memberId, rating, feedback);

    // 5. Revalidate affected pages
    revalidatePath('/department-lead');
    revalidatePath(`/department-lead/evaluations`);
    revalidatePath(`/department-lead/evaluations/${taskId}`);
    revalidatePath(`/department-lead/members/${memberId}`);
    revalidatePath('/member');

    return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHENTICATED' || err.message === 'UNAUTHORIZED') {
        return { success: false, error: 'Unauthorized access.' };
      }
      if (err.message === 'SELF_EVALUATION_FORBIDDEN') {
        return { success: false, error: 'You cannot evaluate your own work.' };
      }
      if (err.message === 'UNAUTHORIZED_TASK') {
        return { success: false, error: 'The requested task does not belong to your club.' };
      }
      if (err.message === 'UNAUTHORIZED_MEMBER') {
        return { success: false, error: 'The member does not belong to your club.' };
      }
      if (err.message === 'COMPLETION_NOT_FOUND') {
        return { success: false, error: 'Only completed work can be evaluated.' };
      }
    }

    // Handle database unique constraint violation gracefully
    if (
      err &&
      (err.code === '23505' ||
        err.message?.includes('duplicate key') ||
        err.message?.includes('evaluations_task_id_member_id_key'))
    ) {
      return { success: false, error: 'This work has already been evaluated.' };
    }

    return { success: false, error: 'An unexpected database error occurred.' };
  }
}
