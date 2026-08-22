import { createSupabaseServerClient } from './server';
import { ClubCompletionDetails } from './department-lead';

export interface ClubEvaluationDetails {
  id: string;
  taskId: string;
  taskTitle: string;
  memberId: string;
  memberName: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

export interface MemberEvaluationDetails {
  id: string;
  taskId: string;
  taskTitle: string;
  rating: number;
  feedback: string;
  createdAt: string;
  evaluatorName: string;
  completionDate: string;
}

/**
 * Fetches all completed tasks for a club that are awaiting evaluation.
 */
export async function getPendingEvaluations(clubId: string): Promise<ClubCompletionDetails[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch tasks for this club
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('club_id', clubId);

  if (tasksError) throw tasksError;
  const taskIds = tasks?.map((t) => t.id) || [];
  if (taskIds.length === 0) return [];

  // 2. Fetch completions for these tasks
  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select(`
      id,
      task_id,
      user_id,
      status,
      notes,
      submitted_at,
      user:users (
        id,
        full_name,
        email
      )
    `)
    .in('task_id', taskIds)
    .order('submitted_at', { ascending: false });

  if (completionsError) throw completionsError;
  if (!completions || completions.length === 0) return [];

  // 3. Fetch existing evaluations for these tasks to filter out
  const { data: evals, error: evalsError } = await supabase
    .from('evaluations')
    .select('task_id, member_id')
    .in('task_id', taskIds);

  if (evalsError) throw evalsError;

  // Filter out any completion that already has an evaluation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredCompletions = (completions || []).filter((c: any) => {
    return !evals?.some((e) => e.task_id === c.task_id && e.member_id === c.user_id);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return filteredCompletions.map((c: any) => {
    const task = tasks.find((t) => t.id === c.task_id);
    return {
      id: c.id,
      taskId: c.task_id,
      taskTitle: task?.title || 'Unknown Task',
      memberId: c.user_id,
      memberName: c.user?.full_name || 'Unknown Member',
      memberEmail: c.user?.email || '',
      status: c.status,
      notes: c.notes,
      submittedAt: c.submitted_at,
    };
  });
}

/**
 * Fetches all evaluations submitted for tasks belonging to a club.
 */
export async function getEvaluatedTasks(clubId: string): Promise<ClubEvaluationDetails[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch tasks for this club
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('club_id', clubId);

  if (tasksError) throw tasksError;
  const taskIds = tasks?.map((t) => t.id) || [];
  if (taskIds.length === 0) return [];

  // 2. Fetch evaluations for these tasks
  const { data: evals, error: evalsError } = await supabase
    .from('evaluations')
    .select('id, task_id, member_id, rating, feedback, created_at')
    .in('task_id', taskIds)
    .order('created_at', { ascending: false });

  if (evalsError) throw evalsError;
  if (!evals || evals.length === 0) return [];

  // 3. Fetch user details for members
  const memberIds = Array.from(new Set(evals.map((e) => e.member_id)));
  const { data: members, error: membersError } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', memberIds);

  if (membersError) throw membersError;

  return evals.map((e) => {
    const task = tasks.find((t) => t.id === e.task_id);
    const member = members?.find((m) => m.id === e.member_id);
    return {
      id: e.id,
      taskId: e.task_id,
      taskTitle: task?.title || 'Unknown Task',
      memberId: e.member_id,
      memberName: member?.full_name || 'Unknown Member',
      rating: e.rating,
      feedback: e.feedback,
      createdAt: e.created_at,
    };
  });
}

/**
 * Fetches evaluation details including task information, member info, completion details, and evaluation data (if exists).
 */
export async function getEvaluationDetail(clubId: string, taskId: string, memberId: string) {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch task and verify it belongs to this club
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, club_id, created_at')
    .eq('id', taskId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (taskError || !task) return null;

  // 2. Fetch membership of the member to verify they belong to this club and are active
  const { data: membership, error: memError } = await supabase
    .from('memberships')
    .select(`
      joined_at,
      user:users (
        id,
        full_name,
        email
      )
    `)
    .eq('user_id', memberId)
    .eq('club_id', clubId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (memError || !membership) return null;

  // 3. Fetch task completion details
  const { data: completion, error: compError } = await supabase
    .from('task_completions')
    .select('status, notes, submitted_at')
    .eq('task_id', taskId)
    .eq('user_id', memberId)
    .maybeSingle();

  if (compError || !completion) return null;

  // 4. Fetch evaluation details if already evaluated
  const { data: evaluation, error: evalError } = await supabase
    .from('evaluations')
    .select(`
      id,
      rating,
      feedback,
      created_at,
      evaluator:users (
        id,
        full_name,
        email
      )
    `)
    .eq('task_id', taskId)
    .eq('member_id', memberId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (membership as any).user;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const evaluatorUser = evaluation?.evaluator as any;

  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      createdAt: task.created_at,
    },
    member: {
      id: memberId,
      fullName: user?.full_name || 'Unknown Member',
      email: user?.email || '',
      joinedAt: membership.joined_at,
    },
    completion: {
      status: completion.status,
      notes: completion.notes,
      submittedAt: completion.submitted_at,
    },
    evaluation:
      evalError || !evaluation
        ? null
        : {
            id: evaluation.id,
            rating: evaluation.rating,
            feedback: evaluation.feedback,
            createdAt: evaluation.created_at,
            evaluatorName: evaluatorUser?.full_name || 'Unknown Evaluator',
          },
  };
}

/**
 * Creates a new evaluation record.
 */
export async function createEvaluation(
  clubId: string,
  evaluatorId: string,
  taskId: string,
  memberId: string,
  rating: number,
  feedback: string
) {
  const supabase = await createSupabaseServerClient();

  // 1. Verify evaluator is not evaluating themselves
  if (evaluatorId === memberId) {
    throw new Error('SELF_EVALUATION_FORBIDDEN');
  }

  // 2. Verify task belongs to this club
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('club_id')
    .eq('id', taskId)
    .single();

  if (taskError || !task || task.club_id !== clubId) {
    throw new Error('UNAUTHORIZED_TASK');
  }

  // 3. Verify member belongs to this club and is active
  const { data: membership, error: memError } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('user_id', memberId)
    .eq('club_id', clubId)
    .eq('status', 'ACTIVE')
    .single();

  if (memError || !membership) {
    throw new Error('UNAUTHORIZED_MEMBER');
  }

  // 4. Verify task completion exists
  const { data: completion, error: compError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', memberId)
    .maybeSingle();

  if (compError || !completion) {
    throw new Error('COMPLETION_NOT_FOUND');
  }

  // 5. Insert evaluation
  const { data, error } = await supabase
    .from('evaluations')
    .insert({
      task_id: taskId,
      member_id: memberId,
      evaluator_id: evaluatorId,
      rating,
      feedback,
    })
    .select()
    .single();

  if (error) {
    // Gracefully propagate database errors (e.g. duplicate key)
    throw error;
  }

  return data;
}

/**
 * Fetches evaluation history for a specific member.
 */
export async function getMemberEvaluations(memberId: string): Promise<MemberEvaluationDetails[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch evaluations for this member
  const { data: evals, error: evalsError } = await supabase
    .from('evaluations')
    .select(`
      id,
      task_id,
      rating,
      feedback,
      created_at,
      evaluator:users (
        full_name
      )
    `)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (evalsError) throw evalsError;
  if (!evals || evals.length === 0) return [];

  const taskIds = Array.from(new Set(evals.map((e) => e.task_id)));

  // 2. Fetch tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title')
    .in('id', taskIds);

  if (tasksError) throw tasksError;

  // 3. Fetch completions
  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select('task_id, submitted_at')
    .eq('user_id', memberId)
    .in('task_id', taskIds);

  if (completionsError) throw completionsError;

  return evals.map((e) => {
    const task = tasks?.find((t) => t.id === e.task_id);
    const completion = completions?.find((c) => c.task_id === e.task_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evaluatorUser = e.evaluator as any;

    return {
      id: e.id,
      taskId: e.task_id,
      taskTitle: task?.title || 'Unknown Task',
      rating: e.rating,
      feedback: e.feedback,
      createdAt: e.created_at,
      evaluatorName: evaluatorUser?.full_name || 'Unknown Evaluator',
      completionDate: completion?.submitted_at || e.created_at,
    };
  });
}
