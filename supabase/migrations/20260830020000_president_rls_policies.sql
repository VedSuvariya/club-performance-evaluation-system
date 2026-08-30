-- 1. Select policy for clubs table
CREATE POLICY "Club presidents can view their assigned club" ON public.clubs
  FOR SELECT TO authenticated
  USING (club_president_id = auth.uid());

-- 2. Select policy for memberships table
CREATE POLICY "Club presidents can view memberships of their assigned club" ON public.memberships
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = memberships.club_id
    AND c.club_president_id = auth.uid()
  ));

-- 3. Select policy for tasks table
CREATE POLICY "Club presidents can view tasks of their assigned club" ON public.tasks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = tasks.club_id
    AND c.club_president_id = auth.uid()
  ));

-- 4. Select policy for task_assignments table
CREATE POLICY "Club presidents can view assignments of their assigned club" ON public.task_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = task_assignments.task_id
    AND c.club_president_id = auth.uid()
  ));

-- 5. Select policy for task_completions table
CREATE POLICY "Club presidents can view completions of their assigned club" ON public.task_completions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = task_completions.task_id
    AND c.club_president_id = auth.uid()
  ));

-- 6. Select policy for evaluations table
CREATE POLICY "Club presidents can view evaluations of their assigned club" ON public.evaluations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = evaluations.task_id
    AND c.club_president_id = auth.uid()
  ));

-- 7. Select policy for reports table (for viewing club performance or member evaluation reports in their club)
CREATE POLICY "Club presidents can view reports of their assigned club" ON public.reports
  FOR SELECT TO authenticated
  USING (
    target_club_id = (SELECT id FROM public.clubs WHERE club_president_id = auth.uid())
    OR
    target_user_id IN (
      SELECT user_id FROM public.memberships m
      JOIN public.clubs c ON c.id = m.club_id
      WHERE c.club_president_id = auth.uid()
    )
  );

-- 8. Clean up the debug RPC helper function
DROP FUNCTION IF EXISTS public.exec_sql(text);
