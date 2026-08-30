import { createSupabaseServerClient } from './server';

export interface ClubMemberStats {
  id: string;
  fullName: string;
  email: string;
  status: string;
  joinedAt: string;
  assignedCount: number;
  completedCount: number;
  pendingCount: number;
}

export interface ClubTaskDetails {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: string;
  createdAt: string;
  assignedCount: number;
  completedCount: number;
  submittedCount: number;
}

export interface ClubCompletionDetails {
  id: string;
  taskId: string;
  taskTitle: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  status: string;
  notes: string;
  submittedAt: string;
}

/**
 * Fetches the club managed by the Department Lead.
 */
export async function getLeadClub(leadUserId: string) {
  const supabase = await createSupabaseServerClient();

  console.log('========== GET LEAD CLUB ==========');
  console.log('leadUserId received:', leadUserId);

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  console.log('Supabase auth user:', authData?.user?.id);
  console.log('Supabase auth email:', authData?.user?.email);
  console.log('Supabase auth error:', authError);

  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, description, department_lead_id')
    .eq('department_lead_id', leadUserId)
    .maybeSingle();

  console.log('Club query data:', data);

  if (error) {
    console.error('========== GET LEAD CLUB ERROR ==========');
    console.error('message:', error.message);
    console.error('code:', error.code);
    console.error('details:', error.details);
    console.error('hint:', error.hint);
    console.error('========================================');

    throw error;
  }

  console.log('========== GET LEAD CLUB SUCCESS ==========');
  console.log('Club:', data);
  console.log('==========================================');

  return data;
}

/**
 * Fetches all members belonging to the lead's club along with their task statistics.
 */
export async function getClubMembersWithStats(
  clubId: string
): Promise<ClubMemberStats[]> {
  const supabase = await createSupabaseServerClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from('memberships')
    .select(`
      status,
      joined_at,
      user:users (
        id,
        email,
        full_name
      )
    `)
    .eq('club_id', clubId)
    .eq('status', 'ACTIVE');

  if (membershipsError) throw membershipsError;

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('club_id', clubId);

  if (tasksError) throw tasksError;

  const taskIds = tasks?.map((t) => t.id) || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assignments: any[] = [];

  if (taskIds.length > 0) {
    const { data: assoc, error: assocError } = await supabase
      .from('task_assignments')
      .select('user_id, task_id')
      .in('task_id', taskIds);

    if (assocError) throw assocError;

    assignments = assoc || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let completions: any[] = [];

  if (taskIds.length > 0) {
    const { data: compl, error: complError } = await supabase
      .from('task_completions')
      .select('user_id, task_id, status')
      .in('task_id', taskIds);

    if (complError) throw complError;

    completions = compl || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (memberships || []).map((m: any) => {
    const user = m.user;
    const memberUserId = user?.id || '';

    const assigned = assignments.filter(
      (a) => a.user_id === memberUserId
    );

    const completed = completions.filter(
      (c) =>
        c.user_id === memberUserId &&
        c.status === 'APPROVED'
    );

    const pending = assignments.filter((a) => {
      const hasCompletion = completions.some(
        (c) =>
          c.task_id === a.task_id &&
          c.user_id === memberUserId
      );

      return !hasCompletion;
    });

    return {
      id: memberUserId,
      fullName: user?.full_name || 'Unknown',
      email: user?.email || '',
      status: m.status,
      joinedAt: m.joined_at,
      assignedCount: assigned.length,
      completedCount: completed.length,
      pendingCount: pending.length,
    };
  });
}

/**
 * Fetches single member detail and task logs.
 */
export async function getMemberPerformanceDetails(
  clubId: string,
  memberId: string
) {
  const supabase = await createSupabaseServerClient();

  const { data: membership, error: membershipError } =
    await supabase
      .from('memberships')
      .select(`
        status,
        joined_at,
        user:users (
          id,
          email,
          full_name
        )
      `)
      .eq('club_id', clubId)
      .eq('user_id', memberId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

  if (membershipError) throw membershipError;

  if (!membership) return null;

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(
      'id, title, description, due_date, status'
    )
    .eq('club_id', clubId);

  if (tasksError) throw tasksError;

  const taskIds = tasks?.map((t) => t.id) || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assignments: any[] = [];

  if (taskIds.length > 0) {
    const { data: assoc, error: assocError } =
      await supabase
        .from('task_assignments')
        .select('task_id, assigned_at')
        .eq('user_id', memberId)
        .in('task_id', taskIds);

    if (assocError) throw assocError;

    assignments = assoc || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let completions: any[] = [];

  if (taskIds.length > 0) {
    const { data: compl, error: complError } =
      await supabase
        .from('task_completions')
        .select(
          'task_id, status, notes, submitted_at'
        )
        .eq('user_id', memberId)
        .in('task_id', taskIds);

    if (complError) throw complError;

    completions = compl || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberTasks = assignments.map((a: any) => {
    const task = tasks?.find(
      (t) => t.id === a.task_id
    );

    const completion = completions.find(
      (c) => c.task_id === a.task_id
    );

    return {
      taskId: a.task_id,
      title: task?.title || '',
      description: task?.description || '',
      dueDate: task?.due_date || null,
      assignedAt: a.assigned_at,
      completion: completion
        ? {
          status: completion.status,
          notes: completion.notes,
          submittedAt: completion.submitted_at,
        }
        : null,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (membership as any).user;

  return {
    id: memberId,
    fullName: user?.full_name || 'Unknown',
    email: user?.email || '',
    joinedAt: membership.joined_at,
    tasks: memberTasks,
  };
}

/**
 * Creates a task for the club.
 */
export async function createTaskForClub(
  clubId: string,
  creatorId: string,
  title: string,
  description: string,
  dueDate: string | null
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      club_id: clubId,
      creator_id: creatorId,
      title,
      description,
      due_date: dueDate || null,
      status: 'OPEN',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Assigns a task to members.
 */
export async function assignTaskToMembers(
  clubId: string,
  taskId: string,
  memberIds: string[]
) {
  const supabase = await createSupabaseServerClient();

  console.log('========== ASSIGN TASK ==========');
  console.log('clubId:', clubId);
  console.log('taskId:', taskId);
  console.log('memberIds:', memberIds);

  // =========================================================
  // 1. Verify task belongs to this club
  // =========================================================

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, club_id')
    .eq('id', taskId)
    .single();

  if (
    taskError ||
    !task ||
    task.club_id !== clubId
  ) {
    console.error('TASK VERIFICATION FAILED:', taskError);
    throw new Error('UNAUTHORIZED_TASK');
  }

  console.log('Task verified:', task);

  // =========================================================
  // 2. Verify all members belong to this club and are active
  // =========================================================

  const {
    data: memberships,
    error: memError,
  } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('status', 'ACTIVE')
    .in('user_id', memberIds);

  if (memError) {
    console.error('MEMBERSHIP ERROR:', memError);
    throw memError;
  }

  if (
    !memberships ||
    memberships.length !== memberIds.length
  ) {
    console.error(
      'MEMBER VERIFICATION FAILED',
    );

    console.error(
      'Requested members:',
      memberIds
    );

    console.error(
      'Verified memberships:',
      memberships
    );

    throw new Error('UNAUTHORIZED_MEMBERS');
  }

  console.log(
    'Members verified:',
    memberships
  );

  // =========================================================
  // 3. Check existing assignments
  // =========================================================

  const {
    data: existing,
    error: existError,
  } = await supabase
    .from('task_assignments')
    .select('user_id')
    .eq('task_id', taskId)
    .in('user_id', memberIds);

  if (existError) {
    console.error(
      'EXISTING ASSIGNMENTS ERROR:',
      existError
    );

    throw existError;
  }

  const existingUserIds =
    existing?.map(
      (assignment) => assignment.user_id
    ) || [];

  const newUserIds = memberIds.filter(
    (id) => !existingUserIds.includes(id)
  );

  console.log(
    'Existing assignments:',
    existingUserIds
  );

  console.log(
    'New assignments:',
    newUserIds
  );

  // =========================================================
  // 4. Nothing new to insert
  // =========================================================

  if (newUserIds.length === 0) {
    console.log(
      'All selected members are already assigned.'
    );

    return [];
  }

  // =========================================================
  // 5. Insert through SECURITY DEFINER RPC
  // =========================================================

  const insertedAssignments: {
    task_id: string;
    user_id: string;
  }[] = [];

  for (const userId of newUserIds) {
    console.log(
      `Creating assignment for member: ${userId}`
    );

    const {
      error: rpcError,
    } = await supabase.rpc(
      'create_task_assignment',
      {
        p_task_id: taskId,
        p_user_id: userId,
      }
    );

    if (rpcError) {
      console.error(
        'CREATE ASSIGNMENT RPC ERROR:',
        rpcError
      );

      throw rpcError;
    }

    insertedAssignments.push({
      task_id: taskId,
      user_id: userId,
    });
  }

  // =========================================================
  // 6. Done
  // =========================================================

  console.log(
    'Assignments created successfully:',
    insertedAssignments
  );

  console.log(
    '================================='
  );

  return insertedAssignments;
}
/**
 * Fetches all tasks created for a club.
 */
export async function getClubTasks(
  clubId: string
): Promise<ClubTaskDetails[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: tasks,
    error: tasksError,
  } = await supabase
    .from('tasks')
    .select(
      'id, title, description, due_date, status, created_at'
    )
    .eq('club_id', clubId)
    .order('created_at', {
      ascending: false,
    });

  if (tasksError) throw tasksError;

  const taskIds =
    tasks?.map((t) => t.id) || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assignments: any[] = [];

  if (taskIds.length > 0) {
    const {
      data: assoc,
      error: assocError,
    } = await supabase
      .from('task_assignments')
      .select('task_id, user_id')
      .in('task_id', taskIds);

    if (assocError) throw assocError;

    assignments = assoc || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let completions: any[] = [];

  if (taskIds.length > 0) {
    const {
      data: compl,
      error: complError,
    } = await supabase
      .from('task_completions')
      .select(
        'task_id, user_id, status'
      )
      .in('task_id', taskIds);

    if (complError) throw complError;

    completions = compl || [];
  }

  return (tasks || []).map((t) => {
    const taskAssoc = assignments.filter(
      (a) => a.task_id === t.id
    );

    const taskCompl = completions.filter(
      (c) => c.task_id === t.id
    );

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      status: t.status,
      createdAt: t.created_at,
      assignedCount: taskAssoc.length,
      completedCount: taskCompl.filter(
        (c) => c.status === 'APPROVED'
      ).length,
      submittedCount: taskCompl.filter(
        (c) => c.status === 'SUBMITTED'
      ).length,
    };
  });
}

/**
 * Fetches all completed task reviews for a club.
 */
export async function getClubCompletions(
  clubId: string
): Promise<ClubCompletionDetails[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: tasks,
    error: tasksError,
  } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('club_id', clubId);

  if (tasksError) throw tasksError;

  const taskIds =
    tasks?.map((t) => t.id) || [];

  if (taskIds.length === 0) {
    return [];
  }

  const {
    data: completions,
    error: completionsError,
  } = await supabase
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
    .order('submitted_at', {
      ascending: false,
    });

  if (completionsError) throw completionsError;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (completions || []).map((c: any) => {
    const task = tasks.find(
      (t) => t.id === c.task_id
    );

    return {
      id: c.id,
      taskId: c.task_id,
      taskTitle: task?.title || 'Unknown Task',
      memberId: c.user_id,
      memberName:
        c.user?.full_name || 'Unknown Member',
      memberEmail: c.user?.email || '',
      status: c.status,
      notes: c.notes,
      submittedAt: c.submitted_at,
    };
  });
}