/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from './server';
import { getClubSummaryStats, ClubSummaryStats } from './reports';

export interface SwcDashboardData {
  totalClubsCount: number;
  activeClubsCount: number;
  overallAverageRating: number;
  overallCompletionRate: number;
  recentReportsCount: number;
  recentTransfersCount: number;
  recentActivity: {
    id: string;
    type: 'REPORT' | 'TRANSFER' | 'EVALUATION';
    title: string;
    description: string;
    timestamp: string;
  }[];
}

export interface ClubDirectoryItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  memberCount: number;
  averageRating: number;
  completionRate: number;
  presidentName: string;
  leadName: string;
}

export interface SwcClubDetail extends ClubSummaryStats {
  name: string;
  description: string;
  president: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  departmentLead: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  isActive: boolean;
}

/**
 * Fetches dashboard summary and activities for the SWC Council.
 */
export async function getSwcDashboardData(): Promise<SwcDashboardData> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch clubs count
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select('id, is_active');
  if (clubsError) throw clubsError;

  const totalClubsCount = clubs?.length || 0;
  const activeClubsCount = (clubs || []).filter((c) => c.is_active).length;

  // 2. Fetch system-wide task counts for completion rate
  const [assocRes, complRes, evalsRes, reportsRes, transfersRes] = await Promise.all([
    supabase.from('task_assignments').select('user_id'),
    supabase.from('task_completions').select('status').eq('status', 'APPROVED'),
    supabase.from('evaluations').select('rating, created_at, task_id, member_id'),
    supabase.from('reports').select('id, report_type, created_at, target_club:clubs (name), target_user:users!target_user_id (full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('club_transfer_requests').select('id, status, created_at, user:users!user_id (full_name), new_club:clubs!new_club_id (name)').order('created_at', { ascending: false }).limit(5),
  ]);

  if (assocRes.error) throw assocRes.error;
  if (complRes.error) throw complRes.error;
  if (evalsRes.error) throw evalsRes.error;
  if (reportsRes.error) throw reportsRes.error;
  if (transfersRes.error) throw transfersRes.error;

  const assignmentsCount = assocRes.data?.length || 0;
  const completionsCount = complRes.data?.length || 0;
  const overallCompletionRate = assignmentsCount > 0 ? Math.round((completionsCount / assignmentsCount) * 100) : 0;

  // 3. Fetch global ratings
  const evaluations = evalsRes.data || [];
  const totalEvaluated = evaluations.length;
  let overallAverageRating = 0;
  if (totalEvaluated > 0) {
    const sum = evaluations.reduce((acc, curr) => acc + curr.rating, 0);
    overallAverageRating = Number((sum / totalEvaluated).toFixed(2));
  }

  // Fetch task titles and member names for the evaluations in-memory
  const taskIds = [...new Set(evaluations.map((e) => e.task_id).filter(Boolean))];
  const memberIds = [...new Set(evaluations.map((e) => e.member_id).filter(Boolean))];

  const [tasksRes, membersRes] = await Promise.all([
    taskIds.length > 0
      ? supabase.from('tasks').select('id, title').in('id', taskIds)
      : Promise.resolve({ data: null, error: null }),
    memberIds.length > 0
      ? supabase.from('users').select('id, full_name').in('id', memberIds)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (membersRes.error) throw membersRes.error;

  const taskTitleMap = new Map<string, string>(
    (tasksRes.data || []).map((t) => [t.id, t.title])
  );
  const memberNameMap = new Map<string, string>(
    (membersRes.data || []).map((m) => [m.id, m.full_name])
  );

  // 4. Fetch reports count
  const { count: recentReportsCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true });

  // 5. Fetch pending transfers count
  const { count: pendingTransfersCount } = await supabase
    .from('club_transfer_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  // 6. Compile System Activity
  const activityItems: any[] = [];

  // Add reports
  if (reportsRes.data) {
    reportsRes.data.forEach((r: any) => {
      const targetText = r.report_type === 'CLUB_SUMMARY'
        ? `Club "${r.target_club?.name || 'Club'}"`
        : `Member "${r.target_user?.full_name || 'Member'}"`;
      activityItems.push({
        id: `rep-${r.id}`,
        type: 'REPORT',
        title: 'Report Generated',
        description: `New Performance Report generated for ${targetText}`,
        timestamp: r.created_at,
      });
    });
  }

  // Add transfers
  if (transfersRes.data) {
    transfersRes.data.forEach((t: any) => {
      activityItems.push({
        id: `trans-${t.id}`,
        type: 'TRANSFER',
        title: 'Club Transfer Filed',
        description: `Transfer request by ${t.user?.full_name || 'Member'} to ${t.new_club?.name || 'Club'} is ${t.status}`,
        timestamp: t.created_at,
      });
    });
  }

  // Add evaluations
  evaluations.slice(0, 5).forEach((e: any, idx: number) => {
    const memberName = memberNameMap.get(e.member_id) || 'Member';
    const taskTitle = taskTitleMap.get(e.task_id) || 'Task';
    activityItems.push({
      id: `eval-${idx}`,
      type: 'EVALUATION',
      title: 'Member Evaluated',
      description: `Evaluation submitted for ${memberName} on "${taskTitle}" (★${e.rating})`,
      timestamp: e.created_at,
    });
  });

  const recentActivity = activityItems
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return {
    totalClubsCount,
    activeClubsCount,
    overallAverageRating,
    overallCompletionRate,
    recentReportsCount: recentReportsCount || 0,
    recentTransfersCount: pendingTransfersCount || 0,
    recentActivity,
  };
}

/**
 * Lists all clubs in the database with aggregated statistics and user mappings.
 */
export async function getClubsDirectoryData(): Promise<ClubDirectoryItem[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch clubs with president and lead users
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select(`
      id,
      name,
      description,
      is_active,
      president:users!club_president_id (full_name),
      lead:users!department_lead_id (full_name)
    `);

  if (clubsError) throw clubsError;
  if (!clubs || clubs.length === 0) return [];

  // 2. Fetch stats for each club
  const directoryItems: ClubDirectoryItem[] = [];

  for (const club of clubs) {
    const stats = await getClubSummaryStats(club.id);
    const c = club as any;

    directoryItems.push({
      id: c.id,
      name: c.name,
      description: c.description || '',
      isActive: c.is_active,
      memberCount: stats?.memberCount || 0,
      averageRating: stats?.averageRating || 0,
      completionRate: stats?.completionRate || 0,
      presidentName: c.president?.full_name || 'Unassigned',
      leadName: c.lead?.full_name || 'Unassigned',
    });
  }

  return directoryItems;
}

/**
 * Fetches deep statistics, profiles, and reports context for a single club.
 */
export async function getSwcClubDetail(clubId: string): Promise<SwcClubDetail | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch club info and profile names
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select(`
      id,
      name,
      description,
      is_active,
      president:users!club_president_id (id, full_name, email),
      lead:users!department_lead_id (id, full_name, email)
    `)
    .eq('id', clubId)
    .maybeSingle();

  if (clubError || !club) return null;

  // 2. Fetch the standard summary stats
  const summaryStats = await getClubSummaryStats(club.id);
  if (!summaryStats) return null;

  const c = club as any;
  return {
    ...summaryStats,
    name: c.name,
    description: c.description || '',
    president: c.president ? {
      id: c.president.id,
      fullName: c.president.full_name || 'Unknown',
      email: c.president.email || '',
    } : null,
    departmentLead: c.lead ? {
      id: c.lead.id,
      fullName: c.lead.full_name || 'Unknown',
      email: c.lead.email || '',
    } : null,
    isActive: c.is_active,
  };
}
