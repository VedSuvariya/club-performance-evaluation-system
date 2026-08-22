/* eslint-disable @typescript-eslint/no-explicit-any */
// Disabling any checks because Supabase nested join select returns have complex
// anonymous shapes that are extremely tedious and volatile to type strictly.
import { createSupabaseServerClient } from './server';

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

/**
 * Retrieves all-time performance metrics and evaluations history for a single member across all clubs.
 * Used for the member's own performance dashboard view.
 */
export async function getMemberPerformanceSummary(memberId: string): Promise<MemberPerformanceSummary> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch total assigned tasks
  const { count: totalAssignedCount, error: assignedError } = await supabase
    .from('task_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', memberId);

  if (assignedError) throw assignedError;
  const totalAssigned = totalAssignedCount || 0;

  // 2. Fetch total completed tasks
  const { count: totalCompletedCount, error: completedError } = await supabase
    .from('task_completions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', memberId);

  if (completedError) throw completedError;
  const totalCompleted = totalCompletedCount || 0;

  // 3. Fetch evaluations with task & evaluator details
  const { data: evaluations, error: evaluationsError } = await supabase
    .from('evaluations')
    .select(`
      id,
      task_id,
      rating,
      feedback,
      created_at,
      task:tasks (
        title
      ),
      evaluator:users (
        full_name
      )
    `)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (evaluationsError) throw evaluationsError;

  const totalEvaluated = evaluations?.length || 0;
  const pendingEvaluations = Math.max(0, totalCompleted - totalEvaluated);

  let averageRating = 0;
  if (totalEvaluated > 0) {
    const sum = evaluations.reduce((acc, curr) => acc + curr.rating, 0);
    averageRating = Number((sum / totalEvaluated).toFixed(2));
  }

  const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  // Map to EvaluationRecord
  const recentEvaluations: EvaluationRecord[] = (evaluations || []).map((e: any) => ({
    id: e.id,
    taskId: e.task_id,
    taskTitle: e.task?.title || 'Unknown Task',
    rating: e.rating,
    feedback: e.feedback,
    createdAt: e.created_at,
    evaluatorName: e.evaluator?.full_name || 'Unknown Lead',
  }));

  // Trend data in chronological order (ASC)
  const trendData: PerformanceTrendPoint[] = [...recentEvaluations]
    .reverse()
    .map((e) => ({
      date: new Date(e.createdAt).toLocaleDateString(),
      rating: e.rating,
      taskTitle: e.taskTitle,
    }));

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

/**
 * Retrieves performance metrics for all members active in a specific club.
 * Used for the Department Lead performance dashboard.
 */
export async function getClubMembersPerformanceList(clubId: string): Promise<ClubMemberPerformance[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch active memberships
  const { data: memberships, error: memError } = await supabase
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

  if (memError) throw memError;
  if (!memberships || memberships.length === 0) return [];

  // 2. Fetch all tasks belonging to this club
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('club_id', clubId);

  if (tasksError) throw tasksError;
  const taskIds = tasks?.map((t) => t.id) || [];

  if (taskIds.length === 0) {
    return memberships.map((m: any) => ({
      id: m.user?.id || '',
      fullName: m.user?.full_name || 'Unknown Member',
      email: m.user?.email || '',
      joinedAt: m.joined_at,
      assignedCount: 0,
      completedCount: 0,
      evaluatedCount: 0,
      completionRate: 0,
      averageRating: 0,
    }));
  }

  // 3. Batch fetch assignments, completions, evaluations for these tasks to avoid N+1 queries
  const [assocRes, complRes, evalsRes] = await Promise.all([
    supabase.from('task_assignments').select('user_id, task_id').in('task_id', taskIds),
    supabase.from('task_completions').select('user_id, task_id').in('task_id', taskIds),
    supabase.from('evaluations').select('member_id, task_id, rating').in('task_id', taskIds),
  ]);

  if (assocRes.error) throw assocRes.error;
  if (complRes.error) throw complRes.error;
  if (evalsRes.error) throw evalsRes.error;

  const assignments = assocRes.data || [];
  const completions = complRes.data || [];
  const evaluations = evalsRes.data || [];

  // 4. Compute metrics in-memory
  return memberships.map((m: any) => {
    const userId = m.user?.id || '';
    const userAssignments = assignments.filter((a) => a.user_id === userId);
    const userCompletions = completions.filter((c) => c.user_id === userId);
    const userEvaluations = evaluations.filter((e) => e.member_id === userId);

    const assignedCount = userAssignments.length;
    const completedCount = userCompletions.length;
    const evaluatedCount = userEvaluations.length;

    const ratingSum = userEvaluations.reduce((sum, e) => sum + e.rating, 0);
    const averageRating = evaluatedCount > 0 ? Number((ratingSum / evaluatedCount).toFixed(2)) : 0;
    const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

    return {
      id: userId,
      fullName: m.user?.full_name || 'Unknown Member',
      email: m.user?.email || '',
      joinedAt: m.joined_at,
      assignedCount,
      completedCount,
      evaluatedCount,
      completionRate,
      averageRating,
    };
  });
}

/**
 * Retrieves single member detail and task logs isolated to a specific club department.
 * Used for the Department Lead member detail page.
 */
export async function getMemberClubPerformanceDetails(
  clubId: string,
  memberId: string
): Promise<MemberClubPerformanceDetails | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch active membership details and verify club boundaries
  const { data: membership, error: memError } = await supabase
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

  if (memError || !membership) return null;
  const user = (membership as any).user;

  // 2. Fetch all tasks belonging to this club
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, status')
    .eq('club_id', clubId);

  if (tasksError) throw tasksError;
  const taskIds = tasks?.map((t) => t.id) || [];

  if (taskIds.length === 0) {
    return {
      member: {
        id: memberId,
        fullName: user?.full_name || 'Unknown Member',
        email: user?.email || '',
        joinedAt: membership.joined_at,
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

  // 3. Batch fetch data for this member
  const [assocRes, complRes, evalsRes] = await Promise.all([
    supabase
      .from('task_assignments')
      .select('task_id, assigned_at')
      .eq('user_id', memberId)
      .in('task_id', taskIds),
    supabase
      .from('task_completions')
      .select('task_id, status, notes, submitted_at')
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
      .order('created_at', { ascending: false }),
  ]);

  if (assocRes.error) throw assocRes.error;
  if (complRes.error) throw complRes.error;
  if (evalsRes.error) throw evalsRes.error;

  const assignments = assocRes.data || [];
  const completions = complRes.data || [];
  const evaluations = evalsRes.data || [];

  // Compute stats
  const assignedCount = assignments.length;
  const completedCount = completions.length;
  const evaluatedCount = evaluations.length;
  const pendingEvaluations = Math.max(0, completedCount - evaluatedCount);
  const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

  const ratingSum = evaluations.reduce((sum, e) => sum + e.rating, 0);
  const averageRating = evaluatedCount > 0 ? Number((ratingSum / evaluatedCount).toFixed(2)) : 0;

  // Format task logs
  const taskHistory = assignments.map((a) => {
    const task = tasks?.find((t) => t.id === a.task_id);
    const completion = completions.find((c) => c.task_id === a.task_id);
    const evaluation = evaluations.find((e) => e.task_id === a.task_id);

    return {
      taskId: a.task_id,
      title: task?.title || 'Unknown Task',
      assignedAt: a.assigned_at,
      dueDate: task?.due_date || null,
      status: completion ? completion.status : 'PENDING',
      notes: completion ? completion.notes : '',
      completionDate: completion ? completion.submitted_at : null,
      evaluation: evaluation
        ? {
            rating: evaluation.rating,
            feedback: evaluation.feedback,
          }
        : null,
    };
  });

  // Recent evaluations
  const recentEvaluations: EvaluationRecord[] = evaluations.map((e: any) => ({
    id: e.id,
    taskId: e.task_id,
    taskTitle: tasks?.find((t) => t.id === e.task_id)?.title || 'Unknown Task',
    rating: e.rating,
    feedback: e.feedback,
    createdAt: e.created_at,
    evaluatorName: e.evaluator?.full_name || 'Unknown Lead',
  }));

  // Trend data chronologically (ASC)
  const trendData: PerformanceTrendPoint[] = [...recentEvaluations]
    .reverse()
    .map((e) => ({
      date: new Date(e.createdAt).toLocaleDateString(),
      rating: e.rating,
      taskTitle: e.taskTitle,
    }));

  return {
    member: {
      id: memberId,
      fullName: user?.full_name || 'Unknown Member',
      email: user?.email || '',
      joinedAt: membership.joined_at,
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
