/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from './server';

export interface ReportRecord {
  id: string;
  reportType: 'MEMBER_EVALUATION' | 'CLUB_SUMMARY';
  targetUserId: string | null;
  targetClubId: string | null;
  generatedBy: string;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  storagePath: string;
  createdAt: string;
  updatedAt: string;
  targetUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  targetClub?: {
    id: string;
    name: string;
  } | null;
  generator?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export interface ClubSummaryStats {
  clubId: string;
  clubName: string;
  description: string;
  memberCount: number;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;
  evaluatedMembersCount: number;
  averageRating: number;
  membersList: {
    id: string;
    fullName: string;
    email: string;
    assignedCount: number;
    completedCount: number;
    completionRate: number;
    averageRating: number;
  }[];
  recentEvaluations: {
    id: string;
    taskTitle: string;
    memberName: string;
    rating: number;
    feedback: string;
    createdAt: string;
  }[];
}

/**
 * Creates a new report record with status 'GENERATING'.
 * Uses a placeholder 'pending' for the NOT NULL storage_path.
 */
export async function createReportRecord(
  reportType: 'MEMBER_EVALUATION' | 'CLUB_SUMMARY',
  targetUserId: string | null,
  targetClubId: string | null,
  generatedBy: string
): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  const authenticatedUserId = authUser.id;

  if (generatedBy !== authenticatedUserId) {
    throw new Error('GENERATOR_ID_MISMATCH');
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      report_type: reportType,
      target_user_id: targetUserId,
      target_club_id: targetClubId,
      generated_by: authenticatedUserId,
      status: 'GENERATING',
      storage_path: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating report record:', error);
    throw error;
  }

  if (!data?.id) {
    throw new Error('REPORT_ID_NOT_CREATED');
  }

  return data.id;
}

export async function updateReportStatus(
  reportId: string,
  status: 'COMPLETED' | 'FAILED',
  storagePath: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('reports')
    .update({
      status,
      storage_path: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
}
/**
 * Retrieves a single report record by ID, joining necessary fields.
 */
export async function getReportById(reportId: string): Promise<ReportRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id,
      report_type,
      target_user_id,
      target_club_id,
      generated_by,
      status,
      storage_path,
      created_at,
      updated_at,
      target_user:users!target_user_id (id, full_name, email),
      target_club:clubs!target_club_id (id, name),
      generator:users!generated_by (id, full_name, email, role)
    `)
    .eq('id', reportId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const r = data as any;
  return {
    id: r.id,
    reportType: r.report_type,
    targetUserId: r.target_user_id,
    targetClubId: r.target_club_id,
    generatedBy: r.generated_by,
    status: r.status,
    storagePath: r.storage_path,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    targetUser: r.target_user ? {
      id: r.target_user.id,
      fullName: r.target_user.full_name || '',
      email: r.target_user.email || '',
    } : null,
    targetClub: r.target_club ? {
      id: r.target_club.id,
      name: r.target_club.name || '',
    } : null,
    generator: r.generator ? {
      id: r.generator.id,
      fullName: r.generator.full_name || '',
      email: r.generator.email || '',
      role: r.generator.role || 'MEMBER',
    } : null,
  };
}

/**
 * Gets report history with optional scope filters.
 */
export async function getReportsHistory(filters: {
  userId?: string;
  clubId?: string;
  generatedBy?: string;
}): Promise<ReportRecord[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('reports')
    .select(`
      id,
      report_type,
      target_user_id,
      target_club_id,
      generated_by,
      status,
      storage_path,
      created_at,
      updated_at,
      target_user:users!target_user_id (id, full_name, email),
      target_club:clubs!target_club_id (id, name),
      generator:users!generated_by (id, full_name, email, role)
    `);

  if (filters.userId) {
    query = query.eq('target_user_id', filters.userId);
  }
  if (filters.clubId) {
    // Fetch all user IDs who are/were members of this club
    const { data: memberships } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('club_id', filters.clubId);

    const memberIds = (memberships || [])
      .map((m: any) => m.user_id)
      .filter(Boolean);

    if (memberIds.length > 0) {
      query = query.or(
        `target_club_id.eq.${filters.clubId},target_user_id.in.(${memberIds.join(',')})`
      );
    } else {
      query = query.eq('target_club_id', filters.clubId);
    }
  }
  if (filters.generatedBy) {
    query = query.eq('generated_by', filters.generatedBy);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as any[]).map((r) => ({
    id: r.id,
    reportType: r.report_type,
    targetUserId: r.target_user_id,
    targetClubId: r.target_club_id,
    generatedBy: r.generated_by,
    status: r.status,
    storagePath: r.storage_path,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    targetUser: r.target_user ? {
      id: r.target_user.id,
      fullName: r.target_user.full_name || '',
      email: r.target_user.email || '',
    } : null,
    targetClub: r.target_club ? {
      id: r.target_club.id,
      name: r.target_club.name || '',
    } : null,
    generator: r.generator ? {
      id: r.generator.id,
      fullName: r.generator.full_name || '',
      email: r.generator.email || '',
      role: r.generator.role || 'MEMBER',
    } : null,
  }));
}

/**
 * Aggregates live database metrics for a Club Performance Summary report.
 */
export async function getClubSummaryStats(
  clubId: string
): Promise<ClubSummaryStats | null> {
  const supabase = await createSupabaseServerClient();

  // ----------------------------------------------------------
  // 1. FETCH CLUB INFO
  // ----------------------------------------------------------

  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('id, name, description')
    .eq('id', clubId)
    .maybeSingle();

  if (clubError || !club) {
    return null;
  }

  // ----------------------------------------------------------
  // 2. FETCH ACTIVE CLUB MEMBERS
  // ----------------------------------------------------------

  const { data: memberships, error: memError } = await supabase
    .from('memberships')
    .select(`
      user:users (
        id,
        full_name,
        email
      )
    `)
    .eq('club_id', clubId)
    .eq('status', 'ACTIVE');

  if (memError) {
    throw memError;
  }

  const memberCount = memberships?.length || 0;

  // ----------------------------------------------------------
  // 3. FETCH ALL TASKS FOR THE CLUB
  // ----------------------------------------------------------

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('club_id', clubId);

  if (tasksError) {
    throw tasksError;
  }

  const taskIds = tasks?.map((t) => t.id) || [];

  // ----------------------------------------------------------
  // 4. IF NO TASKS EXIST
  // ----------------------------------------------------------

  if (taskIds.length === 0) {
    return {
      clubId,
      clubName: club.name,
      description: club.description || '',
      memberCount,

      totalAssigned: 0,
      totalCompleted: 0,
      completionRate: 0,

      evaluatedMembersCount: 0,
      averageRating: 0,

      membersList: (memberships || []).map((m: any) => ({
        id: m.user?.id || '',
        fullName: m.user?.full_name || 'Unknown Member',
        email: m.user?.email || '',
        assignedCount: 0,
        completedCount: 0,
        completionRate: 0,
        averageRating: 0,
      })),

      recentEvaluations: [],
    };
  }

  // ----------------------------------------------------------
  // 5. FETCH ASSIGNMENTS, COMPLETIONS AND EVALUATIONS
  // ----------------------------------------------------------
  //
  // IMPORTANT:
  // Do NOT join evaluations -> users here.
  //
  // evaluations.member_id does not have a usable foreign-key
  // relationship to users in the Supabase schema.
  //
  // Therefore, evaluations are fetched first and member names
  // are fetched separately below.
  // ----------------------------------------------------------

  const [assocRes, complRes, evalsRes] = await Promise.all([
    supabase
      .from('task_assignments')
      .select('user_id, task_id')
      .in('task_id', taskIds),

    supabase
      .from('task_completions')
      .select('user_id, task_id, status')
      .in('task_id', taskIds),

    supabase
      .from('evaluations')
      .select(`
        id,
        member_id,
        task_id,
        rating,
        feedback,
        created_at
      `)
      .in('task_id', taskIds)
      .order('created_at', {
        ascending: false,
      }),
  ]);

  if (assocRes.error) {
    throw assocRes.error;
  }

  if (complRes.error) {
    throw complRes.error;
  }

  if (evalsRes.error) {
    throw evalsRes.error;
  }

  const assignments = assocRes.data || [];
  const completions = complRes.data || [];
  const evaluations = evalsRes.data || [];

  // ----------------------------------------------------------
  // 6. FETCH EVALUATED MEMBER NAMES SEPARATELY
  // ----------------------------------------------------------

  const memberIds = [
    ...new Set(
      evaluations
        .map((e: any) => e.member_id)
        .filter(Boolean)
    ),
  ];

  let memberNameMap = new Map<string, string>();

  if (memberIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', memberIds);

    if (membersError) {
      throw membersError;
    }

    memberNameMap = new Map(
      (members || []).map((member: any) => [
        member.id,
        member.full_name || 'Unknown Member',
      ])
    );
  }

  // ----------------------------------------------------------
  // 7. OVERALL TASK METRICS
  // ----------------------------------------------------------

  const totalAssigned = assignments.length;

  const totalCompleted = completions.filter(
    (c) => c.status === 'APPROVED'
  ).length;

  const completionRate =
    totalAssigned > 0
      ? Math.round(
        (totalCompleted / totalAssigned) * 100
      )
      : 0;

  // ----------------------------------------------------------
  // 8. OVERALL RATING METRICS
  // ----------------------------------------------------------

  const totalEvaluated = evaluations.length;

  let averageRating = 0;

  if (totalEvaluated > 0) {
    const ratingSum = evaluations.reduce(
      (sum, e) => sum + Number(e.rating || 0),
      0
    );

    averageRating = Number(
      (ratingSum / totalEvaluated).toFixed(2)
    );
  }

  // ----------------------------------------------------------
  // 9. COUNT UNIQUE EVALUATED MEMBERS
  // ----------------------------------------------------------

  const evaluatedMemberIds = new Set(
    evaluations
      .map((e) => e.member_id)
      .filter(Boolean)
  );

  const evaluatedMembersCount =
    evaluatedMemberIds.size;

  // ----------------------------------------------------------
  // 10. INDIVIDUAL MEMBER METRICS
  // ----------------------------------------------------------

  const membersList = (memberships || []).map(
    (m: any) => {
      const userId = m.user?.id || '';

      const userAssignments =
        assignments.filter(
          (a) => a.user_id === userId
        );

      const userCompletions =
        completions.filter(
          (c) =>
            c.user_id === userId &&
            c.status === 'APPROVED'
        );

      const userEvaluations =
        evaluations.filter(
          (e) => e.member_id === userId
        );

      const assignedCount =
        userAssignments.length;

      const completedCount =
        userCompletions.length;

      const completionRate =
        assignedCount > 0
          ? Math.round(
            (completedCount / assignedCount) * 100
          )
          : 0;

      const ratingSum =
        userEvaluations.reduce(
          (sum, e) =>
            sum + Number(e.rating || 0),
          0
        );

      const averageRating =
        userEvaluations.length > 0
          ? Number(
            (
              ratingSum /
              userEvaluations.length
            ).toFixed(2)
          )
          : 0;

      return {
        id: userId,

        fullName:
          m.user?.full_name ||
          'Unknown Member',

        email:
          m.user?.email ||
          '',

        assignedCount,

        completedCount,

        completionRate,

        averageRating,
      };
    }
  );

  // ----------------------------------------------------------
  // 11. RECENT EVALUATIONS
  // ----------------------------------------------------------

  const recentEvaluations =
    evaluations
      .slice(0, 10)
      .map((e: any) => {
        const task = tasks.find(
          (t) => t.id === e.task_id
        );

        return {
          id: e.id,

          taskTitle:
            task?.title ||
            'Unknown Task',

          memberName:
            memberNameMap.get(e.member_id) ||
            'Unknown Member',

          rating:
            Number(e.rating || 0),

          feedback:
            e.feedback || '',

          createdAt:
            e.created_at,
        };
      });

  // ----------------------------------------------------------
  // 12. RETURN CLUB PERFORMANCE SUMMARY
  // ----------------------------------------------------------

  return {
    clubId,

    clubName:
      club.name,

    description:
      club.description || '',

    memberCount,

    totalAssigned,

    totalCompleted,

    completionRate,

    evaluatedMembersCount,

    averageRating,

    membersList,

    recentEvaluations,
  };
}
