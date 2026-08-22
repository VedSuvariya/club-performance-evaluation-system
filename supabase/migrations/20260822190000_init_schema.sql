-- 1. Create users/profiles table in public schema
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('MEMBER', 'DEPARTMENT_LEAD', 'CLUB_PRESIDENT', 'STUDENT_WELFARE_COUNCIL')) DEFAULT 'MEMBER',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Create clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  department_lead_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  club_president_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create memberships table (to preserve historical membership)
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Partial index to ensure a user has at most one ACTIVE membership at a time
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_user_membership 
ON public.memberships (user_id) 
WHERE (status = 'ACTIVE');

-- 4. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')) DEFAULT 'OPEN',
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Create task_assignments table (tasks can be assigned to multiple members)
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

-- 6. Create task_completions table (members submit their completions)
CREATE TABLE IF NOT EXISTS public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')) DEFAULT 'SUBMITTED',
  notes text NOT NULL DEFAULT '',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Ensure only assigned members can submit a completion
  FOREIGN KEY (task_id, user_id) REFERENCES public.task_assignments(task_id, user_id) ON DELETE CASCADE
);

-- 7. Create evaluations table (ratings & feedback submitted by Department Leads)
CREATE TABLE IF NOT EXISTS public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  member_id uuid NOT NULL,
  evaluator_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Enforce that evaluations can only be submitted against completed work
  FOREIGN KEY (task_id, member_id) REFERENCES public.task_completions(task_id, user_id) ON DELETE CASCADE,
  -- Ensure at most one evaluation per member per task
  UNIQUE (task_id, member_id),
  -- CRITICAL BUSINESS RULE: Members must not evaluate their own work
  CONSTRAINT evaluator_not_member CHECK (evaluator_id <> member_id)
);

-- 8. Create club_transfer_requests table
CREATE TABLE IF NOT EXISTS public.club_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE RESTRICT,
  new_club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')) DEFAULT 'PENDING',
  reason text NOT NULL DEFAULT '',
  decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decided_at timestamp with time zone,
  comments text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 9. Create reports table (report metadata)
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('MEMBER_EVALUATION', 'CLUB_SUMMARY')),
  target_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  generated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('GENERATING', 'COMPLETED', 'FAILED')) DEFAULT 'GENERATING',
  storage_path text NOT NULL, -- Path to PDF in Supabase Storage
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 10. Create indexes for foreign keys and common queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_clubs_department_lead ON public.clubs(department_lead_id);
CREATE INDEX IF NOT EXISTS idx_clubs_club_president ON public.clubs(club_president_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_club_id ON public.memberships(club_id);
CREATE INDEX IF NOT EXISTS idx_tasks_club_id ON public.tasks(club_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON public.tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON public.task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_member_id ON public.evaluations(member_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_id ON public.evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_club_transfer_requests_user_id ON public.club_transfer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_target_user ON public.reports(target_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_target_club ON public.reports(target_club_id);

-- 11. Create trigger to automatically create/sync profiles from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'MEMBER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
