/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from './server';
import { getPendingEvaluations } from './evaluations';
import { getPendingTransferRequests } from './club-transfers';

export interface RecentActivityItem {
  id: string;
  type: 'EVALUATION' | 'SUBMISSION' | 'TRANSFER';
  title: string;
  description: string;
  timestamp: string;
}

export interface PresidentDashboardData {
  memberCount: number;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;
  averageRating: number;
  activeTasksCount: number;
  pendingEvaluationsCount: number;
  pendingTransfersCount: number;
  recentActivity: RecentActivityItem[];
}

/**
 * Fetches the club managed by the Club President, including Department Lead.
 */
export async function getPresidentClub(presidentUserId: string) {
  const supabase = await createSupabaseServerClient();
  

  const { data, error } = await supabase
    .from('clubs')
    .select(`
      id,
      name,
      description,
      department_lead:users!department_lead_id (
        id,
        full_name,
        email
      )
    `)
    .eq('club_president_id', presidentUserId)
    .maybeSingle();

  console.log('[DEBUG getPresidentClub] joinedQuery data:', data);
  console.log('[DEBUG getPresidentClub] joinedQuery error:', error);

  if (error) throw error;
  if (!data) return null;

  const c = data as any;
  return {
    id: c.id,
    name: c.name,
    description: c.description || '',
    departmentLead: c.department_lead ? {
      id: c.department_lead.id,
      fullName: c.department_lead.full_name || 'Unknown Lead',
      email: c.department_lead.email || '',
    } : null,
  };
}

/**
 * Fetches real aggregated dashboard metrics and recent activity for the Club President.
 */
export async function getPresidentDashboardData(clubId: string): Promise<PresidentDashboardData> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch active club members count
  const { data: memberships, error: memError } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('status', 'ACTIVE');

  if (memError) throw memError;
  const memberCount = memberships?.length || 0;

  // 2. Fetch all tasks for this club
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, status')
    .eq('club_id', clubId);

  if (tasksError) throw tasksError;
  const taskIds = (tasks || []).map((t) => t.id);

  const activeTasksCount = (tasks || []).filter(
    (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
  ).length;

  // If no tasks, return base stats with zero counts
  if (taskIds.length === 0) {
    const pendingTransfers = await getPendingTransferRequests(clubId);
    return {
      memberCount,
      totalAssigned: 0,
      totalCompleted: 0,
      completionRate: 0,
      averageRating: 0,
      activeTasksCount,
      pendingEvaluationsCount: 0,
      pendingTransfersCount: pendingTransfers.length,
      recentActivity: [],
    };
  }

  // 3. Fetch assignments, completions, and evaluations
  const [assocRes, complRes, evalsRes, pendingTransfers] = await Promise.all([
    supabase.from('task_assignments').select('user_id, task_id').in('task_id', taskIds),
    supabase.from('task_completions').select('user_id, task_id, status, submitted_at, user:users (full_name)').in('task_id', taskIds),
    supabase.from('evaluations').select(`
      id,
      member_id,
      task_id,
      rating,
      feedback,
      created_at
    `).in('task_id', taskIds),
    getPendingTransferRequests(clubId),
  ]);

  if (assocRes.error) throw assocRes.error;
  if (complRes.error) throw complRes.error;
  if (evalsRes.error) throw evalsRes.error;

  const assignments = assocRes.data || [];
  const completions = complRes.data || [];
  const evaluations = evalsRes.data || [];

  // Fetch member profiles separately to avoid non-existent FK join crash
  const memberIds = [...new Set(evaluations.map((e) => e.member_id).filter(Boolean))];
  let memberNameMap = new Map<string, string>();
  if (memberIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', memberIds);
    if (!membersError && members) {
      memberNameMap = new Map(members.map((m) => [m.id, m.full_name || '']));
    }
  }

  const totalAssigned = assignments.length;
  const totalCompleted = completions.filter((c) => c.status === 'APPROVED').length;
  const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  // Rating metrics
  const totalEvaluated = evaluations.length;
  let averageRating = 0;
  if (totalEvaluated > 0) {
    const ratingSum = evaluations.reduce((sum, e) => sum + e.rating, 0);
    averageRating = Number((ratingSum / totalEvaluated).toFixed(2));
  }

  // Pending evaluations count (awaiting review)
  const pending = await getPendingEvaluations(clubId);
  const pendingEvaluationsCount = pending.length;

  // Create tasks map for quick lookup
  const taskMap = new Map((tasks || []).map((t) => [t.id, t.title]));

  // 4. Assemble recent activity timeline
  const activityItems: RecentActivityItem[] = [];

  // Add recent evaluations
  evaluations.forEach((e: any) => {
    const memberName = memberNameMap.get(e.member_id) || 'Unknown';
    const taskTitle = taskMap.get(e.task_id) || 'Task';
    activityItems.push({
      id: `eval-${e.id}`,
      type: 'EVALUATION',
      title: 'New Evaluation Submitted',
      description: `Member ${memberName} was evaluated on task "${taskTitle}" with rating ★${e.rating}`,
      timestamp: e.created_at,
    });
  });

  // Add recent task submissions (completions)
  completions.forEach((c: any) => {
    const taskTitle = taskMap.get(c.task_id) || 'Task';
    activityItems.push({
      id: `compl-${c.task_id}-${c.user_id}`,
      type: 'SUBMISSION',
      title: 'Work Completed',
      description: `Member ${c.user?.full_name || 'Unknown'} submitted task completion for "${taskTitle}" (Status: ${c.status})`,
      timestamp: c.submitted_at,
    });
  });

  // Add recent transfer requests involving this club
  const { data: recentTransfers, error: transError } = await supabase
    .from('club_transfer_requests')
    .select(`
      id,
      created_at,
      status,
      user:users (full_name),
      new_club:clubs!new_club_id (name),
      current_club:clubs!current_club_id (name)
    `)
    .or(`current_club_id.eq.${clubId},new_club_id.eq.${clubId}`)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!transError && recentTransfers) {
    recentTransfers.forEach((t: any) => {
      const direction = t.current_club_id === clubId ? 'outward' : 'inward';
      activityItems.push({
        id: `trans-${t.id}`,
        type: 'TRANSFER',
        title: `Transfer Request (${direction})`,
        description: `${t.user?.full_name || 'Unknown Member'} requested transfer from ${t.current_club?.name || 'Club'} to ${t.new_club?.name || 'Club'} (Status: ${t.status})`,
        timestamp: t.created_at,
      });
    });
  }

  // Sort chronologically descending and limit to 10
  const recentActivity = activityItems
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return {
    memberCount,
    totalAssigned,
    totalCompleted,
    completionRate,
    averageRating,
    activeTasksCount,
    pendingEvaluationsCount,
    pendingTransfersCount: pendingTransfers.length,
    recentActivity,
  };
}
