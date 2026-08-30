import { createSupabaseServerClient } from './server';

interface RawMembershipData {
  id: string;
  user_id: string;
  club_id: string;
  joined_at: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  club: {
    name: string;
  } | null;
}

interface RawTransferRequest {
  id: string;
  user_id: string;
  current_club_id: string;
  new_club_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  comments: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  current_club: { name: string } | null;
  new_club: { name: string } | null;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface ClubMembership {
  id: string;
  userId: string;
  clubId: string;
  clubName: string;
  joinedAt: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface ClubInfo {
  id: string;
  name: string;
  description: string;
}

export interface TransferRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  currentClubId: string;
  currentClubName: string;
  newClubId: string;
  newClubName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  comments: string;
  decidedBy?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

/**
 * Gets the current active membership for a user.
 */
export async function getCurrentMembership(userId: string): Promise<ClubMembership | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      user_id,
      club_id,
      status,
      joined_at,
      club:clubs (name)
    `)
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const membershipData = data as unknown as RawMembershipData;
  return {
    id: membershipData.id,
    userId: membershipData.user_id,
    clubId: membershipData.club_id,
    clubName: membershipData.club?.name || 'Unknown Club',
    joinedAt: membershipData.joined_at,
    status: membershipData.status,
  };
}

/**
 * Retrieves all active clubs that are available for transfer (excludes the member's current club).
 */
export async function getAvailableClubs(currentClubId: string | null): Promise<ClubInfo[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('clubs').select('id, name, description').eq('is_active', true);

  if (currentClubId) {
    query = query.neq('id', currentClubId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((club: { id: string; name: string; description: string | null }) => ({
    id: club.id,
    name: club.name,
    description: club.description || '',
  }));
}

/**
 * Checks if the user already has a pending transfer request.
 */
export async function hasPendingRequest(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('club_transfer_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'PENDING')
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Submits a new club transfer request.
 */
export async function createTransferRequest(
  userId: string,
  currentClubId: string,
  targetClubId: string,
  reason: string
): Promise<TransferRequest> {
  const supabase = await createSupabaseServerClient();

  // 1. Enforce that members cannot select their current club as target
  if (currentClubId === targetClubId) {
    throw new Error('TARGET_CLUB_IS_CURRENT_CLUB');
  }

  // 2. Prevent duplicate pending requests
  const pendingExists = await hasPendingRequest(userId);
  if (pendingExists) {
    throw new Error('DUPLICATE_PENDING_REQUEST');
  }

  // 3. Verify target club is active and valid
  const { data: targetClub, error: targetError } = await supabase
    .from('clubs')
    .select('id, is_active')
    .eq('id', targetClubId)
    .single();

  if (targetError || !targetClub || !targetClub.is_active) {
    throw new Error('TARGET_CLUB_INVALID_OR_INACTIVE');
  }

  // 4. Create request
  const { data, error } = await supabase
    .from('club_transfer_requests')
    .insert({
      user_id: userId,
      current_club_id: currentClubId,
      new_club_id: targetClubId,
      reason: reason,
      status: 'PENDING',
    })
    .select(`
      id,
      user_id,
      current_club_id,
      new_club_id,
      status,
      reason,
      comments,
      decided_by,
      decided_at,
      created_at,
      current_club:clubs!current_club_id (name),
      new_club:clubs!new_club_id (name)
    `)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'FAILED_TO_CREATE_TRANSFER_REQUEST');
  }

  const req = data as unknown as RawTransferRequest;
  return {
    id: req.id,
    userId: req.user_id,
    currentClubId: req.current_club_id,
    currentClubName: req.current_club?.name || 'Unknown',
    newClubId: req.new_club_id,
    newClubName: req.new_club?.name || 'Unknown',
    status: req.status,
    reason: req.reason,
    comments: req.comments || '',
    decidedBy: req.decided_by,
    decidedAt: req.decided_at,
    createdAt: req.created_at,
  };
}

/**
 * Gets transfer history for a specific user.
 */
export async function getMemberTransferHistory(userId: string): Promise<TransferRequest[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('club_transfer_requests')
    .select(`
      id,
      user_id,
      current_club_id,
      new_club_id,
      status,
      reason,
      comments,
      decided_by,
      decided_at,
      created_at,
      current_club:clubs!current_club_id (name),
      new_club:clubs!new_club_id (name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as RawTransferRequest[]).map((req) => ({
    id: req.id,
    userId: req.user_id,
    currentClubId: req.current_club_id,
    currentClubName: req.current_club?.name || 'Unknown',
    newClubId: req.new_club_id,
    newClubName: req.new_club?.name || 'Unknown',
    status: req.status,
    reason: req.reason,
    comments: req.comments || '',
    decidedBy: req.decided_by,
    decidedAt: req.decided_at,
    createdAt: req.created_at,
  }));
}

/**
 * Retrieves all pending transfer requests for the Club President to review.
 */
export async function getPendingTransferRequests(clubId?: string): Promise<TransferRequest[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('club_transfer_requests')
    .select(`
      id,
      user_id,
      current_club_id,
      new_club_id,
      status,
      reason,
      comments,
      decided_by,
      decided_at,
      created_at,
      user:users (id, full_name, email),
      current_club:clubs!current_club_id (name),
      new_club:clubs!new_club_id (name)
    `)
    .eq('status', 'PENDING');

  if (clubId) {
    query = query.or(`current_club_id.eq.${clubId},new_club_id.eq.${clubId}`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as RawTransferRequest[]).map((req) => ({
    id: req.id,
    userId: req.user_id,
    userName: req.user?.full_name || 'Unknown Member',
    userEmail: req.user?.email || '',
    currentClubId: req.current_club_id,
    currentClubName: req.current_club?.name || 'Unknown',
    newClubId: req.new_club_id,
    newClubName: req.new_club?.name || 'Unknown',
    status: req.status,
    reason: req.reason,
    comments: req.comments || '',
    decidedBy: req.decided_by,
    decidedAt: req.decided_at,
    createdAt: req.created_at,
  }));
}

/**
 * Approves a club transfer request atomically using database transaction.
 */
export async function approveTransferRequest(requestId: string, reviewerId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('approve_club_transfer', {
    p_request_id: requestId,
    p_reviewer_id: reviewerId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Rejects a club transfer request.
 */
export async function rejectTransferRequest(
  requestId: string,
  reviewerId: string,
  comments: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('reject_club_transfer', {
    p_request_id: requestId,
    p_reviewer_id: reviewerId,
    p_comments: comments,
  });

  if (error) {
    throw new Error(error.message);
  }
}
