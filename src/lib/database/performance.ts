/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSupabaseServerClient } from './server';

// ============================================================
// TYPES
// ============================================================

export interface PerformanceTrendPoint {
  date: string;
  rating: number;
  taskTitle: string;
}

export interface EvaluationRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  rating: number;
  feedback: string;
  createdAt: string;
  evaluatorName: string;
}

export interface MemberPerformanceSummary {
  totalAssigned: number;
  totalCompleted: number;
  totalEvaluated: number;
  pendingEvaluations: number;
  completionRate: number;
  averageRating: number;
  recentEvaluations: EvaluationRecord[];
  trendData: PerformanceTrendPoint[];
}

export interface ClubMemberPerformance {
  id: string;
  fullName: string;
  email: string;
  joinedAt: string;
  assignedCount: number;
  completedCount: number;
  evaluatedCount: number;
  completionRate: number;
  averageRating: number;
}

export interface MemberClubPerformanceDetails {
  member: {
    id: string;
    fullName: string;
    email: string;
    joinedAt: string;
  };

  metrics: {
    assignedCount: number;
    completedCount: number;
    evaluatedCount: number;
    pendingEvaluations: number;
    completionRate: number;
    averageRating: number;
  };

  taskHistory: {
    taskId: string;
    title: string;
    assignedAt: string;
    dueDate: string | null;
    status: string;
    notes: string;
    completionDate: string | null;
    evaluation: {
      rating: number;
      feedback: string;
    } | null;
  }[];

  recentEvaluations: EvaluationRecord[];
  trendData: PerformanceTrendPoint[];
}

// ============================================================
// MEMBER PERFORMANCE SUMMARY
// ============================================================

export async function getMemberPerformanceSummary(
  memberId: string
): Promise<MemberPerformanceSummary> {
  const supabase = await createSupabaseServerClient();

  // ----------------------------------------------------------
  // 1. TOTAL ASSIGNED TASKS
  // ----------------------------------------------------------

  const {
    count: totalAssignedCount,
    error: assignedError,
  } = await supabase
    .from('task_assignments')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', memberId);

  if (assignedError) {
    console.warn(
      'Could not load assigned task count:',
      assignedError
    );

    throw assignedError;
  }

  const totalAssigned = totalAssignedCount ?? 0;

  // ----------------------------------------------------------
  // 2. TOTAL COMPLETED TASKS
  // ----------------------------------------------------------

  const {
    count: totalCompletedCount,
    error: completedError,
  } = await supabase
    .from('task_completions')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', memberId);

  if (completedError) {
    console.warn(
      'Could not load completed task count:',
      completedError
    );

    throw completedError;
  }

  const totalCompleted = totalCompletedCount ?? 0;

  // ----------------------------------------------------------
  // 3. FETCH EVALUATIONS
  //
  // IMPORTANT:
  // Do NOT use nested task/users relationships here.
  // Fetch the evaluation rows directly first.
  // ----------------------------------------------------------

  const {
    data: evaluationData,
    error: evaluationsError,
  } = await supabase
    .from('evaluations')
    .select(`
      id,
      task_id,
      member_id,
      evaluator_id,
      rating,
      feedback,
      created_at
    `)
    .eq('member_id', memberId)
    .order('created_at', {
      ascending: false,
    });

  if (evaluationsError) {
    console.warn(
      'Could not load member evaluations:',
      {
        code: evaluationsError.code,
        message: evaluationsError.message,
        details: evaluationsError.details,
        hint: evaluationsError.hint,
      }
    );

    throw evaluationsError;
  }

  const evaluations = evaluationData ?? [];

  // ----------------------------------------------------------
  // 4. FETCH TASK TITLES
  // ----------------------------------------------------------

  const taskIds = [
    ...new Set(
      evaluations
        .map((evaluation) => evaluation.task_id)
        .filter(Boolean)
    ),
  ];

  let tasks: Array<{
    id: string;
    title: string;
  }> = [];

  if (taskIds.length > 0) {
    const {
      data: taskData,
      error: tasksError,
    } = await supabase
      .from('tasks')
      .select(`
        id,
        title
      `)
      .in('id', taskIds);

    if (tasksError) {
      console.warn(
        'Could not load evaluation task titles:',
        tasksError
      );
    } else {
      tasks = taskData ?? [];
    }
  }

  // ----------------------------------------------------------
  // 5. FETCH EVALUATOR NAMES
  // ----------------------------------------------------------

  const evaluatorIds = [
    ...new Set(
      evaluations
        .map((evaluation) => evaluation.evaluator_id)
        .filter(Boolean)
    ),
  ];

  let evaluators: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }> = [];

  if (evaluatorIds.length > 0) {
    const {
      data: evaluatorData,
      error: evaluatorsError,
    } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        email
      `)
      .in('id', evaluatorIds);

    if (evaluatorsError) {
      console.warn(
        'Could not load evaluator names:',
        evaluatorsError
      );
    } else {
      evaluators = evaluatorData ?? [];
    }
  }

  // ----------------------------------------------------------
  // 6. CALCULATE EVALUATION METRICS
  // ----------------------------------------------------------

  const totalEvaluated = evaluations.length;

  const pendingEvaluations = Math.max(
    0,
    totalCompleted - totalEvaluated
  );

  let averageRating = 0;

  if (totalEvaluated > 0) {
    const ratingSum = evaluations.reduce(
      (sum, evaluation) => {
        return sum + Number(evaluation.rating || 0);
      },
      0
    );

    averageRating = Number(
      (ratingSum / totalEvaluated).toFixed(2)
    );
  }

  // ----------------------------------------------------------
  // 7. COMPLETION RATE
  // ----------------------------------------------------------

  const completionRate =
    totalAssigned > 0
      ? Math.round(
        (totalCompleted / totalAssigned) * 100
      )
      : 0;

  // ----------------------------------------------------------
  // 8. CREATE LOOKUP MAPS
  // ----------------------------------------------------------

  const taskMap = new Map(
    tasks.map((task) => [
      task.id,
      task.title,
    ])
  );

  const evaluatorMap = new Map(
    evaluators.map((evaluator) => [
      evaluator.id,
      evaluator.full_name ||
      evaluator.email ||
      'Unknown Lead',
    ])
  );

  // ----------------------------------------------------------
  // 9. FORMAT RECENT EVALUATIONS
  // ----------------------------------------------------------

  const recentEvaluations: EvaluationRecord[] =
    evaluations.map((evaluation) => ({
      id: evaluation.id,

      taskId: evaluation.task_id,

      taskTitle:
        taskMap.get(evaluation.task_id) ||
        'Unknown Task',

      rating: Number(
        evaluation.rating ?? 0
      ),

      feedback:
        evaluation.feedback ?? '',

      createdAt:
        evaluation.created_at,

      evaluatorName:
        evaluatorMap.get(
          evaluation.evaluator_id
        ) || 'Unknown Lead',
    }));

  // ----------------------------------------------------------
  // 10. CREATE TREND DATA
  // ----------------------------------------------------------

  const trendData: PerformanceTrendPoint[] =
    [...recentEvaluations]
      .reverse()
      .map((evaluation) => ({
        date: new Date(
          evaluation.createdAt
        ).toLocaleDateString(),

        rating:
          evaluation.rating,

        taskTitle:
          evaluation.taskTitle,
      }));

  // ----------------------------------------------------------
  // 11. RETURN MEMBER PERFORMANCE SUMMARY
  // ----------------------------------------------------------

  return {
    totalAssigned,
    totalCompleted,
    totalEvaluated,
    pendingEvaluations,
    completionRate,
    averageRating,
    recentEvaluations,
    trendData,
  };
}

// ============================================================
// CLUB MEMBERS PERFORMANCE LIST
// ============================================================

export async function getClubMembersPerformanceList(
  clubId: string
): Promise<ClubMemberPerformance[]> {
  const supabase = await createSupabaseServerClient();

  // ----------------------------------------------------------
  // 1. ACTIVE MEMBERSHIPS
  // ----------------------------------------------------------

  const {
    data: memberships,
    error: memError,
  } = await supabase
    .from('memberships')
    .select(`
      joined_at,
      user:users (
        id,
        email,
        full_name
      )
    `)
    .eq('club_id', clubId)
    .eq('status', 'ACTIVE');

  if (memError) {
    console.warn(
      'Could not load club memberships:',
      memError
    );

    throw memError;
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  // ----------------------------------------------------------
  // 2. CLUB TASKS
  // ----------------------------------------------------------

  const {
    data: tasks,
    error: tasksError,
  } = await supabase
    .from('tasks')
    .select('id')
    .eq('club_id', clubId);

  if (tasksError) {
    console.warn(
      'Could not load club tasks:',
      tasksError
    );

    throw tasksError;
  }

  const taskIds =
    tasks?.map((task) => task.id) ?? [];

  if (taskIds.length === 0) {
    return memberships.map((membership: any) => ({
      id: membership.user?.id ?? '',
      fullName:
        membership.user?.full_name ??
        'Unknown Member',
      email:
        membership.user?.email ?? '',
      joinedAt:
        membership.joined_at,
      assignedCount: 0,
      completedCount: 0,
      evaluatedCount: 0,
      completionRate: 0,
      averageRating: 0,
    }));
  }

  // ----------------------------------------------------------
  // 3. LOAD ASSIGNMENTS / COMPLETIONS / EVALUATIONS
  // ----------------------------------------------------------

  const [
    assignmentsResult,
    completionsResult,
    evaluationsResult,
  ] = await Promise.all([
    supabase
      .from('task_assignments')
      .select('user_id, task_id')
      .in('task_id', taskIds),

    supabase
      .from('task_completions')
      .select('user_id, task_id')
      .in('task_id', taskIds),

    supabase
      .from('evaluations')
      .select(
        'member_id, task_id, rating'
      )
      .in('task_id', taskIds),
  ]);

  if (assignmentsResult.error) {
    console.warn(
      'Could not load task assignments:',
      assignmentsResult.error
    );

    throw assignmentsResult.error;
  }

  if (completionsResult.error) {
    console.warn(
      'Could not load task completions:',
      completionsResult.error
    );

    throw completionsResult.error;
  }

  const assignments =
    assignmentsResult.data ?? [];

  const completions =
    completionsResult.data ?? [];

  /*
   * Evaluations are optional.
   *
   * If evaluations have an RLS problem, don't break
   * the entire club performance page.
   */

  let evaluations: any[] = [];

  if (evaluationsResult.error) {
    console.warn(
      'Could not load club evaluations. Continuing without evaluations.',
      evaluationsResult.error
    );

    evaluations = [];
  } else {
    evaluations =
      evaluationsResult.data ?? [];
  }

  // ----------------------------------------------------------
  // 4. CALCULATE MEMBER METRICS
  // ----------------------------------------------------------

  return memberships.map((membership: any) => {
    const userId =
      membership.user?.id ?? '';

    const userAssignments =
      assignments.filter(
        (assignment) =>
          assignment.user_id === userId
      );

    const userCompletions =
      completions.filter(
        (completion) =>
          completion.user_id === userId
      );

    const userEvaluations =
      evaluations.filter(
        (evaluation) =>
          evaluation.member_id === userId
      );

    const assignedCount =
      userAssignments.length;

    const completedCount =
      userCompletions.length;

    const evaluatedCount =
      userEvaluations.length;

    const ratingSum =
      userEvaluations.reduce(
        (sum, evaluation) =>
          sum +
          Number(
            evaluation.rating ?? 0
          ),
        0
      );

    const averageRating =
      evaluatedCount > 0
        ? Number(
          (
            ratingSum /
            evaluatedCount
          ).toFixed(2)
        )
        : 0;

    const completionRate =
      assignedCount > 0
        ? Math.round(
          (completedCount /
            assignedCount) *
          100
        )
        : 0;

    return {
      id: userId,

      fullName:
        membership.user?.full_name ??
        'Unknown Member',

      email:
        membership.user?.email ?? '',

      joinedAt:
        membership.joined_at,

      assignedCount,
      completedCount,
      evaluatedCount,
      completionRate,
      averageRating,
    };
  });
}

// ============================================================
// MEMBER CLUB PERFORMANCE DETAILS
// ============================================================

export async function getMemberClubPerformanceDetails(
  clubId: string,
  memberId: string
): Promise<MemberClubPerformanceDetails | null> {
  const supabase =
    await createSupabaseServerClient();

  // ----------------------------------------------------------
  // 1. VERIFY MEMBERSHIP
  // ----------------------------------------------------------

  const {
    data: membership,
    error: memError,
  } = await supabase
    .from('memberships')
    .select(`
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

  if (memError) {
    console.warn(
      'Could not verify membership:',
      memError
    );

    return null;
  }

  if (!membership) {
    return null;
  }

  const user =
    (membership as any).user;

  // ----------------------------------------------------------
  // 2. FETCH CLUB TASKS
  // ----------------------------------------------------------

  const {
    data: tasks,
    error: tasksError,
  } = await supabase
    .from('tasks')
    .select(
      'id, title, description, due_date, status'
    )
    .eq('club_id', clubId);

  if (tasksError) {
    console.warn(
      'Could not load club tasks:',
      tasksError
    );

    throw tasksError;
  }

  const taskIds =
    tasks?.map((task) => task.id) ?? [];

  // ----------------------------------------------------------
  // NO TASKS
  // ----------------------------------------------------------

  if (taskIds.length === 0) {
    return {
      member: {
        id: memberId,

        fullName:
          user?.full_name ??
          'Unknown Member',

        email:
          user?.email ?? '',

        joinedAt:
          membership.joined_at,
      },

      metrics: {
        assignedCount: 0,
        completedCount: 0,
        evaluatedCount: 0,
        pendingEvaluations: 0,
        completionRate: 0,
        averageRating: 0,
      },

      taskHistory: [],
      recentEvaluations: [],
      trendData: [],
    };
  }

  // ----------------------------------------------------------
  // 3. FETCH MEMBER DATA
  // ----------------------------------------------------------

  const [
    assignmentsResult,
    completionsResult,
    evaluationsResult,
  ] = await Promise.all([
    supabase
      .from('task_assignments')
      .select(
        'task_id, assigned_at'
      )
      .eq('user_id', memberId)
      .in('task_id', taskIds),

    supabase
      .from('task_completions')
      .select(
        'task_id, status, notes, submitted_at'
      )
      .eq('user_id', memberId)
      .in('task_id', taskIds),

    supabase
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
      .in('task_id', taskIds)
      .order('created_at', {
        ascending: false,
      }),
  ]);

  if (assignmentsResult.error) {
    console.warn(
      'Could not load member assignments:',
      assignmentsResult.error
    );

    throw assignmentsResult.error;
  }

  if (completionsResult.error) {
    console.warn(
      'Could not load member completions:',
      completionsResult.error
    );

    throw completionsResult.error;
  }

  const assignments =
    assignmentsResult.data ?? [];

  const completions =
    completionsResult.data ?? [];

  let evaluations: any[] = [];

  if (evaluationsResult.error) {
    console.warn(
      'Could not load member evaluations. Continuing without evaluations.',
      evaluationsResult.error
    );

    evaluations = [];
  } else {
    evaluations =
      evaluationsResult.data ?? [];
  }

  // ----------------------------------------------------------
  // 4. CALCULATE METRICS
  // ----------------------------------------------------------

  const assignedCount =
    assignments.length;

  const completedCount =
    completions.length;

  const evaluatedCount =
    evaluations.length;

  const pendingEvaluations =
    Math.max(
      0,
      completedCount -
      evaluatedCount
    );

  const completionRate =
    assignedCount > 0
      ? Math.round(
        (completedCount /
          assignedCount) *
        100
      )
      : 0;

  const ratingSum =
    evaluations.reduce(
      (sum, evaluation) =>
        sum +
        Number(
          evaluation.rating ?? 0
        ),
      0
    );

  const averageRating =
    evaluatedCount > 0
      ? Number(
        (
          ratingSum /
          evaluatedCount
        ).toFixed(2)
      )
      : 0;

  // ----------------------------------------------------------
  // 5. TASK HISTORY
  // ----------------------------------------------------------

  const taskHistory =
    assignments.map((assignment) => {
      const task =
        tasks?.find(
          (item) =>
            item.id ===
            assignment.task_id
        );

      const completion =
        completions.find(
          (item) =>
            item.task_id ===
            assignment.task_id
        );

      const evaluation =
        evaluations.find(
          (item) =>
            item.task_id ===
            assignment.task_id
        );

      return {
        taskId:
          assignment.task_id,

        title:
          task?.title ??
          'Unknown Task',

        assignedAt:
          assignment.assigned_at,

        dueDate:
          task?.due_date ?? null,

        status:
          completion?.status ??
          'PENDING',

        notes:
          completion?.notes ?? '',

        completionDate:
          completion?.submitted_at ??
          null,

        evaluation: evaluation
          ? {
            rating: Number(
              evaluation.rating ??
              0
            ),

            feedback:
              evaluation.feedback ??
              '',
          }
          : null,
      };
    });

  // ----------------------------------------------------------
  // 6. RECENT EVALUATIONS
  // ----------------------------------------------------------

  const recentEvaluations:
    EvaluationRecord[] =
    evaluations.map(
      (evaluation: any) => ({
        id: evaluation.id,

        taskId:
          evaluation.task_id,

        taskTitle:
          tasks?.find(
            (task) =>
              task.id ===
              evaluation.task_id
          )?.title ??
          'Unknown Task',

        rating: Number(
          evaluation.rating ?? 0
        ),

        feedback:
          evaluation.feedback ?? '',

        createdAt:
          evaluation.created_at,

        evaluatorName:
          evaluation.evaluator
            ?.full_name ??
          'Unknown Lead',
      })
    );

  // ----------------------------------------------------------
  // 7. TREND DATA
  // ----------------------------------------------------------

  const trendData:
    PerformanceTrendPoint[] =
    [...recentEvaluations]
      .reverse()
      .map((evaluation) => ({
        date: new Date(
          evaluation.createdAt
        ).toLocaleDateString(),

        rating:
          evaluation.rating,

        taskTitle:
          evaluation.taskTitle,
      }));

  // ----------------------------------------------------------
  // 8. RETURN RESULT
  // ----------------------------------------------------------

  return {
    member: {
      id: memberId,

      fullName:
        user?.full_name ??
        'Unknown Member',

      email:
        user?.email ?? '',

      joinedAt:
        membership.joined_at,
    },

    metrics: {
      assignedCount,
      completedCount,
      evaluatedCount,
      pendingEvaluations,
      completionRate,
      averageRating,
    },

    taskHistory,
    recentEvaluations,
    trendData,
  };
}