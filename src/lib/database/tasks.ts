import { createSupabaseServerClient } from './server';

export interface TaskDetails {
  assignedAt: string;
  task: {
    id: string;
    title: string;
    description: string;
    dueDate: string | null;
    status: string; // 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    clubName: string;
    clubId: string;
  };
  completion: {
    id: string;
    status: string; // 'SUBMITTED' | 'APPROVED' | 'REJECTED'
    notes: string;
    submittedAt: string;
  } | null;
}

/**
 * Fetches all task assignments and completions for a given member.
 */
export async function getMemberTasks(userId: string): Promise<TaskDetails[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch task assignments with tasks and clubs
  const { data: assignments, error: assignmentsError } = await supabase
    .from('task_assignments')
    .select(`
      assigned_at,
      task:tasks (
        id,
        title,
        description,
        due_date,
        status,
        club:clubs (
          id,
          name
        )
      )
    `)
    .eq('user_id', userId);

  if (assignmentsError) {
    throw assignmentsError;
  }

  // 2. Fetch completions for this user
  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select('id, task_id, status, notes, submitted_at')
    .eq('user_id', userId);

  if (completionsError) {
    throw completionsError;
  }

  // 3. Map assignments and completions together
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (assignments || []).map((assignment: any) => {
    const task = assignment.task;
    const completion = (completions || []).find((c) => c.task_id === task?.id);

    return {
      assignedAt: assignment.assigned_at,
      task: {
        id: task?.id || '',
        title: task?.title || '',
        description: task?.description || '',
        dueDate: task?.due_date || null,
        status: task?.status || 'OPEN',
        clubName: task?.club?.name || 'Unknown Club',
        clubId: task?.club?.id || '',
      },
      completion: completion
        ? {
            id: completion.id,
            status: completion.status,
            notes: completion.notes,
            submittedAt: completion.submitted_at,
          }
        : null,
    };
  });
}

/**
 * Fetches details of a single task assigned to the member, verifying assignment.
 */
export async function getMemberTaskDetail(userId: string, taskId: string): Promise<TaskDetails | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch specific task assignment verifying that it belongs to the user
  const { data: assignment, error: assignmentError } = await supabase
    .from('task_assignments')
    .select(`
      assigned_at,
      task:tasks (
        id,
        title,
        description,
        due_date,
        status,
        club:clubs (
          id,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    return null;
  }

  // 2. Fetch completion for this task and user
  const { data: completion, error: completionError } = await supabase
    .from('task_completions')
    .select('id, status, notes, submitted_at')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .maybeSingle();

  if (completionError) {
    throw completionError;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task = (assignment as any).task;

  return {
    assignedAt: assignment.assigned_at,
    task: {
      id: task?.id || '',
      title: task?.title || '',
      description: task?.description || '',
      dueDate: task?.due_date || null,
      status: task?.status || 'OPEN',
      clubName: task?.club?.name || 'Unknown Club',
      clubId: task?.club?.id || '',
    },
    completion: completion
      ? {
          id: completion.id,
          status: completion.status,
          notes: completion.notes,
          submittedAt: completion.submitted_at,
        }
      : null,
  };
}

/**
 * Submits task completion details.
 */
export async function createMemberTaskCompletion(
  userId: string,
  taskId: string,
  notes: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('task_completions')
    .insert({
      task_id: taskId,
      user_id: userId,
      status: 'SUBMITTED',
      notes: notes,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
