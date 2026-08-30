'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/permissions';
import {
  getCurrentMembership,
  createTransferRequest,
  approveTransferRequest,
  rejectTransferRequest,
} from '@/lib/database/club-transfers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/database/server';

const requestTransferSchema = z.object({
  targetClubId: z.string().uuid({ message: 'Invalid target club ID.' }),
  reason: z.string()
    .min(10, { message: 'Transfer reason must be at least 10 characters long.' })
    .max(500, { message: 'Transfer reason must be under 500 characters.' }),
});

const reviewTransferSchema = z.object({
  requestId: z.string().uuid({ message: 'Invalid transfer request ID.' }),
  action: z.enum(['APPROVE', 'REJECT'], { message: 'Invalid review action.' }),
  comments: z.string().max(500, { message: 'Comments must be under 500 characters.' }).optional(),
});

interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * Server Action for a Member to submit a new club transfer request.
 */
export async function requestTransferAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResponse> {
  try {
    // 1. Authenticate user and verify role is MEMBER
    const user = await requireRole('MEMBER');

    // 2. Parse and validate form fields
    const parsed = requestTransferSchema.safeParse({
      targetClubId: formData.get('targetClubId'),
      reason: formData.get('reason'),
    });

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((issue) => issue.message).join(' ');
      return { success: false, error: errorMsg };
    }

    const { targetClubId, reason } = parsed.data;

    // 3. Resolve member's active current club server-side
    const currentMembership = await getCurrentMembership(user.id);
    if (!currentMembership) {
      return { success: false, error: 'You do not have an active club membership to transfer from.' };
    }

    // 4. Invoke repository helper to execute checks and create record
    await createTransferRequest(user.id, currentMembership.clubId, targetClubId, reason);

    // 5. Revalidate cache
    revalidatePath('/member');
    revalidatePath('/member/club-transfer');

    return { success: true };
  } catch (err) {
    let message = 'An unexpected error occurred while submitting your request.';
    const errMessage = err instanceof Error ? err.message : '';
    if (errMessage === 'UNAUTHORIZED') {
      message = 'Unauthorized: Only members can request transfers.';
    } else if (errMessage === 'UNAUTHENTICATED') {
      message = 'Unauthenticated: Please log in to request a transfer.';
    } else if (errMessage === 'TARGET_CLUB_IS_CURRENT_CLUB') {
      message = 'You cannot request a transfer to your current club.';
    } else if (errMessage === 'DUPLICATE_PENDING_REQUEST') {
      message = 'You already have a pending transfer request. Please wait for it to be reviewed.';
    } else if (errMessage === 'TARGET_CLUB_INVALID_OR_INACTIVE') {
      message = 'The requested target club is invalid or inactive.';
    }
    return { success: false, error: message };
  }
}

/**
 * Server Action for the Club President to approve/reject transfer requests.
 */
export async function reviewTransferAction(
  _prevState: unknown,
  data: { requestId: string; action: 'APPROVE' | 'REJECT'; comments?: string }
): Promise<ActionResponse> {
  try {
    // 1. Authenticate user and verify role is CLUB_PRESIDENT
    const reviewer = await requireRole('CLUB_PRESIDENT');

    // 2. Parse and validate input
    const parsed = reviewTransferSchema.safeParse(data);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((issue) => issue.message).join(' ');
      return { success: false, error: errorMsg };
    }

    const { requestId, action, comments } = parsed.data;

    // 2.5 Security boundary check: ensure president owns one of the clubs in the transfer request
    const supabase = await createSupabaseServerClient();
    const { data: presidentClub } = await supabase
      .from('clubs')
      .select('id')
      .eq('club_president_id', reviewer.id)
      .maybeSingle();

    if (!presidentClub) {
      return { success: false, error: 'Unauthorized: You do not manage any club.' };
    }

    const { data: request } = await supabase
      .from('club_transfer_requests')
      .select('current_club_id, new_club_id')
      .eq('id', requestId)
      .maybeSingle();

    if (!request) {
      return { success: false, error: 'Transfer request not found.' };
    }

    if (request.current_club_id !== presidentClub.id && request.new_club_id !== presidentClub.id) {
      return { success: false, error: 'Unauthorized: You can only review transfers related to your club.' };
    }

    // 3. Execute transactional update based on action
    if (action === 'APPROVE') {
      await approveTransferRequest(requestId, reviewer.id);
    } else {
      if (!comments || comments.trim().length < 5) {
        return { success: false, error: 'Rejection comments must be at least 5 characters long.' };
      }
      await rejectTransferRequest(requestId, reviewer.id, comments);
    }

    // 4. Revalidate cache
    revalidatePath('/club-president');
    revalidatePath('/club-president/club-transfers');

    return { success: true };
  } catch (err) {
    let message = 'Failed to process the transfer decision.';
    const errMessage = err instanceof Error ? err.message : '';
    if (errMessage === 'UNAUTHORIZED') {
      message = 'Unauthorized: Only the Club President can review transfers.';
    } else if (errMessage === 'UNAUTHENTICATED') {
      message = 'Unauthenticated: Please log in to review transfers.';
    } else if (errMessage === 'TRANSFER_REQUEST_NOT_FOUND') {
      message = 'The transfer request could not be found.';
    } else if (errMessage === 'TRANSFER_REQUEST_NOT_PENDING') {
      message = 'This transfer request has already been decided or cancelled.';
    } else if (errMessage === 'TARGET_CLUB_INVALID_OR_INACTIVE') {
      message = 'The target club for this transfer is no longer active.';
    }
    return { success: false, error: message };
  }
}
