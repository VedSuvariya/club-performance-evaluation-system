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
  taskId: z.string().uuid({
    message: 'Invalid task ID.',
  }),

  memberId: z.string().uuid({
    message: 'Invalid member ID.',
  }),

  rating: z
    .number()
    .int()
    .min(1, {
      message: 'Rating must be at least 1.',
    })
    .max(5, {
      message: 'Rating cannot be more than 5.',
    }),

  feedback: z.string().max(1000, {
    message: 'Feedback must be less than 1000 characters.',
  }),
});

/**
 * Submits an evaluation for a member's completed task.
 */
export async function submitEvaluationAction(
  _prevState: ActionState | null,
  payload: {
    taskId: string;
    memberId: string;
    rating: number;
    feedback: string;
  }
): Promise<ActionState> {
  try {
    // --------------------------------------------------
    // 1. Authenticate user and require Department Lead
    // --------------------------------------------------
    const user = await requireRole('DEPARTMENT_LEAD');

    // --------------------------------------------------
    // 2. Get the club managed by this Department Lead
    // --------------------------------------------------
    const club = await getLeadClub(user.id);

    if (!club) {
      return {
        success: false,
        error: 'You are not assigned to manage any club.',
      };
    }

    // --------------------------------------------------
    // 3. Validate submitted data
    // --------------------------------------------------
    const validation = submitEvaluationSchema.safeParse(payload);

    if (!validation.success) {
      const errorMsg = validation.error.issues
        .map((issue) => issue.message)
        .join(' ');

      return {
        success: false,
        error: errorMsg,
      };
    }

    const {
      taskId,
      memberId,
      rating,
      feedback,
    } = validation.data;

    // --------------------------------------------------
    // 4. Create evaluation
    // --------------------------------------------------
    await createEvaluation(
      club.id,
      user.id,
      taskId,
      memberId,
      rating,
      feedback
    );

    // --------------------------------------------------
    // 5. Refresh affected pages
    // --------------------------------------------------
    revalidatePath('/department-lead');
    revalidatePath('/department-lead/evaluations');
    revalidatePath(`/department-lead/evaluations/${taskId}`);
    revalidatePath(`/department-lead/members/${memberId}`);
    revalidatePath('/member');
    revalidatePath('/member/tasks');

    // --------------------------------------------------
    // 6. Success
    // --------------------------------------------------
    return {
      success: true,
    };
  } catch (err: any) {
    // --------------------------------------------------
    // Log the REAL database error
    // --------------------------------------------------
    console.error('SUBMIT EVALUATION ERROR:', {
      code: err?.code,
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
      status: err?.status,
    });

    // --------------------------------------------------
    // Authentication errors
    // --------------------------------------------------
    if (err instanceof Error) {
      if (
        err.message === 'UNAUTHENTICATED' ||
        err.message === 'UNAUTHORIZED'
      ) {
        return {
          success: false,
          error: 'Unauthorized access.',
        };
      }

      // ------------------------------------------------
      // Prevent self evaluation
      // ------------------------------------------------
      if (err.message === 'SELF_EVALUATION_FORBIDDEN') {
        return {
          success: false,
          error: 'You cannot evaluate your own work.',
        };
      }

      // ------------------------------------------------
      // Task does not belong to club
      // ------------------------------------------------
      if (err.message === 'UNAUTHORIZED_TASK') {
        return {
          success: false,
          error: 'The requested task does not belong to your club.',
        };
      }

      // ------------------------------------------------
      // Member is not valid
      // ------------------------------------------------
      if (err.message === 'UNAUTHORIZED_MEMBER') {
        return {
          success: false,
          error:
            'The member is not an active member of your club or is not assigned to this task.',
        };
      }

      // ------------------------------------------------
      // Completion does not exist
      // ------------------------------------------------
      if (err.message === 'COMPLETION_NOT_FOUND') {
        return {
          success: false,
          error: 'Only submitted work can be evaluated.',
        };
      }

      // ------------------------------------------------
      // Evaluation already exists
      // ------------------------------------------------
      if (err.message === 'EVALUATION_ALREADY_EXISTS') {
        return {
          success: false,
          error: 'This work has already been evaluated.',
        };
      }
    }

    // --------------------------------------------------
    // PostgreSQL duplicate key error
    // --------------------------------------------------
    if (
      err?.code === '23505' ||
      err?.message?.includes('duplicate key') ||
      err?.message?.includes(
        'evaluations_task_id_member_id_key'
      )
    ) {
      return {
        success: false,
        error: 'This work has already been evaluated.',
      };
    }

    // --------------------------------------------------
    // RLS / permission error
    // --------------------------------------------------
    if (
      err?.code === '42501' ||
      err?.message?.toLowerCase().includes('row-level security') ||
      err?.message?.toLowerCase().includes('permission denied')
    ) {
      return {
        success: false,
        error:
          'Database permission denied while saving the evaluation. Check the evaluations table RLS policy.',
      };
    }

    // --------------------------------------------------
    // Foreign key violation
    // --------------------------------------------------
    if (err?.code === '23503') {
      return {
        success: false,
        error:
          'The evaluation references a task, member, or evaluator that does not exist.',
      };
    }

    // --------------------------------------------------
    // Invalid database data
    // --------------------------------------------------
    if (err?.code === '22P02') {
      return {
        success: false,
        error: 'Invalid data was sent to the database.',
      };
    }

    // --------------------------------------------------
    // Development fallback
    // Show the actual error instead of hiding it
    // --------------------------------------------------
    return {
      success: false,
      error:
        err?.message ||
        err?.details ||
        'An unexpected database error occurred.',
    };
  }
}