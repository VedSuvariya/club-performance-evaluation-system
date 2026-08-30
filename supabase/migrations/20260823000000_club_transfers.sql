-- Create PL/pgSQL functions to handle atomic club transfer request approvals and rejections.

-- 1. Approve Club Transfer Function
CREATE OR REPLACE FUNCTION public.approve_club_transfer(
  p_request_id uuid,
  p_reviewer_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_current_club_id uuid;
  v_new_club_id uuid;
  v_status text;
  v_is_active boolean;
BEGIN
  -- Select and lock the transfer request to prevent concurrent updates
  SELECT user_id, current_club_id, new_club_id, status
  INTO v_user_id, v_current_club_id, v_new_club_id, v_status
  FROM public.club_transfer_requests
  WHERE id = p_request_id
  FOR UPDATE;

  -- Ensure request exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_REQUEST_NOT_FOUND';
  END IF;

  -- Ensure request status is PENDING
  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'TRANSFER_REQUEST_NOT_PENDING';
  END IF;

  -- Ensure the target new club is active and valid
  SELECT is_active INTO v_is_active
  FROM public.clubs
  WHERE id = v_new_club_id;

  IF NOT FOUND OR NOT v_is_active THEN
    RAISE EXCEPTION 'TARGET_CLUB_INVALID_OR_INACTIVE';
  END IF;

  -- Mark all active memberships for this member as INACTIVE
  UPDATE public.memberships
  SET status = 'INACTIVE',
      left_at = now(),
      updated_at = now()
  WHERE user_id = v_user_id
    AND status = 'ACTIVE';

  -- Create a new active membership for the member in the target club
  INSERT INTO public.memberships (user_id, club_id, status, joined_at)
  VALUES (v_user_id, v_new_club_id, 'ACTIVE', now());

  -- Update the transfer request to APPROVED
  UPDATE public.club_transfer_requests
  SET status = 'APPROVED',
      decided_by = p_reviewer_id,
      decided_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Reject Club Transfer Function
CREATE OR REPLACE FUNCTION public.reject_club_transfer(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_comments text
)
RETURNS void AS $$
DECLARE
  v_status text;
BEGIN
  -- Select and lock the transfer request to prevent concurrent updates
  SELECT status INTO v_status
  FROM public.club_transfer_requests
  WHERE id = p_request_id
  FOR UPDATE;

  -- Ensure request exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_REQUEST_NOT_FOUND';
  END IF;

  -- Ensure request status is PENDING
  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'TRANSFER_REQUEST_NOT_PENDING';
  END IF;

  -- Update the transfer request to REJECTED and record comments/reviewer details
  UPDATE public.club_transfer_requests
  SET status = 'REJECTED',
      decided_by = p_reviewer_id,
      decided_at = now(),
      comments = COALESCE(p_comments, ''),
      updated_at = now()
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
