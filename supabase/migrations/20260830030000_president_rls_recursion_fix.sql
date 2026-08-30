-- Drop the recursive policies
DROP POLICY IF EXISTS "Club presidents can view assignments of their assigned club" ON public.task_assignments;
DROP POLICY IF EXISTS "Club presidents can view completions of their assigned club" ON public.task_completions;
DROP POLICY IF EXISTS "Club presidents can view evaluations of their assigned club" ON public.evaluations;

-- Create security-definer helper function to check task visibility for a president
CREATE OR REPLACE FUNCTION public.can_president_view_task(p_task_id uuid, p_president_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = p_task_id AND c.club_president_id = p_president_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using the non-recursive helper function
CREATE POLICY "Club presidents can view assignments of their assigned club" ON public.task_assignments
  FOR SELECT TO authenticated
  USING (public.can_president_view_task(task_id, auth.uid()));

CREATE POLICY "Club presidents can view completions of their assigned club" ON public.task_completions
  FOR SELECT TO authenticated
  USING (public.can_president_view_task(task_id, auth.uid()));

CREATE POLICY "Club presidents can view evaluations of their assigned club" ON public.evaluations
  FOR SELECT TO authenticated
  USING (public.can_president_view_task(task_id, auth.uid()));
