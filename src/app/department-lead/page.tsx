import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import {
  StatCard,
  SectionHeader,
  DataTable,
  StatusBadge,
  ChartCard,
} from '@/components/dashboard/components';
import {
  Users,
  FileText,
  CheckSquare,
  PlusCircle,
  Award,
  Clock,
} from 'lucide-react';

import {
  getClubMembersWithStats,
  getClubTasks,
  getClubCompletions,
  ClubMemberStats,
  ClubTaskDetails,
  ClubCompletionDetails,
} from '@/lib/database/department-lead';

import {
  getPendingEvaluations,
  getEvaluatedTasks,
} from '@/lib/database/evaluations';

import { createSupabaseServerClient } from '@/lib/database/server';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface SubmissionRow {
  id: string;
  memberName: string;
  taskTitle: string;
  submittedAt: string;
  status: string;
}

export default async function DepartmentLeadPage() {
  // ============================================================
  // 1. Get the currently logged-in Department Lead
  // ============================================================

  const profile = await requireRole('DEPARTMENT_LEAD');

  const userProp = {
    fullName: profile.full_name || 'Department Lead',
    email: profile.email || '',
    role: profile.role,
  };

  // ============================================================
  // 2. Find the club directly using department_lead_id
  // ============================================================

  const supabase = await createSupabaseServerClient();

  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select(`
      id,
      name,
      description,
      is_active,
      department_lead_id
    `)
    .eq('department_lead_id', profile.id)
    .maybeSingle();

  if (clubError) {
    console.error('Failed to load lead club:', clubError);
  }

  // ============================================================
  // 3. If no club is found
  // ============================================================

  if (!club) {
    return (
      <AppShell role="DEPARTMENT_LEAD" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="No Club Assigned"
            description="You are currently registered as a Department Lead but have not been assigned to manage any club department yet. Please contact the Club President or Student Welfare Council."
          />
        </div>
      </AppShell>
    );
  }

  // ============================================================
  // 4. Fetch club statistics
  // ============================================================

  let members: ClubMemberStats[] = [];
  let tasks: ClubTaskDetails[] = [];
  let completions: ClubCompletionDetails[] = [];

  let averageRatingStr = 'N/A';
  let pendingEvaluationsCount = 0;
  let evaluatedCount = 0;

  try {
    members = await getClubMembersWithStats(club.id);

    tasks = await getClubTasks(club.id);

    completions = await getClubCompletions(club.id);

    const pending = await getPendingEvaluations(club.id);
    pendingEvaluationsCount = pending.length;

    const evaluated = await getEvaluatedTasks(club.id);
    evaluatedCount = evaluated.length;

    // ==========================================================
    // Calculate average evaluation rating
    // ==========================================================

    const memberIds = members.map((member) => member.id);

    if (memberIds.length > 0) {
      const { data: evals, error: evalsError } = await supabase
        .from('evaluations')
        .select('rating')
        .in('member_id', memberIds);

      if (evalsError) {
        console.error(
          'Failed to load evaluation ratings:',
          evalsError
        );
      }

      if (evals && evals.length > 0) {
        const sum = evals.reduce(
          (acc, curr) => acc + curr.rating,
          0
        );

        averageRatingStr = `${(
          sum / evals.length
        ).toFixed(1)} / 5`;
      }
    }
  } catch (err) {
    console.error(
      'Failed to load dashboard metrics:',
      err
    );
  }

  // ============================================================
  // 5. Compute counters
  // ============================================================

  const totalMembers = members.length;

  const activeTasks = tasks.filter(
    (task) =>
      task.status === 'OPEN' ||
      task.status === 'IN_PROGRESS'
  ).length;

  const pendingCompletions =
    pendingEvaluationsCount;

  const completedTasksCount =
    evaluatedCount;

  // ============================================================
  // 6. Recent submissions
  // ============================================================

  const recentSubmissions: SubmissionRow[] =
    completions
      .slice(0, 5)
      .map((completion) => ({
        id: completion.id,
        memberName: completion.memberName,
        taskTitle: completion.taskTitle,
        submittedAt: new Date(
          completion.submittedAt
        ).toLocaleDateString(),
        status: completion.status,
      }));

  // ============================================================
  // 7. Table columns
  // ============================================================

  const columns = [
    {
      header: 'Member Name',

      accessor: (row: SubmissionRow) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {row.memberName}
        </span>
      ),
    },

    {
      header: 'Task Title',

      accessor: (row: SubmissionRow) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.taskTitle}
        </span>
      ),
    },

    {
      header: 'Submitted',

      accessor: (row: SubmissionRow) => (
        <span className="text-xs text-slate-500">
          {row.submittedAt}
        </span>
      ),
    },

    {
      header: 'Status',

      accessor: (row: SubmissionRow) => {
        const typeMap = {
          SUBMITTED: 'warning' as const,
          APPROVED: 'success' as const,
          REJECTED: 'error' as const,
        };

        const status =
          row.status as
          | 'SUBMITTED'
          | 'APPROVED'
          | 'REJECTED';

        return (
          <StatusBadge
            label={status}
            type={
              typeMap[status] || 'neutral'
            }
          />
        );
      },
    },
  ];

  // ============================================================
  // 8. Dashboard
  // ============================================================

  return (
    <AppShell
      role="DEPARTMENT_LEAD"
      user={userProp}
    >
      <div className="space-y-8">

        {/* Page Title */}
        <SectionHeader
          title={`Department Lead Dashboard — ${club.name}`}
          description={`Welcome back, ${userProp.fullName}. Oversee your club members, manage assignments, and review completed work.`}
        />

        {/* Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="Club Members"
            value={totalMembers}
            subtext="active memberships"
            trend="neutral"
            trendValue="0"
            icon={Users}
          />

          <StatCard
            title="Active Assignments"
            value={activeTasks}
            subtext="tasks in progress"
            trend="neutral"
            trendValue="0"
            icon={FileText}
          />

          <StatCard
            title="Pending Reviews"
            value={pendingCompletions}
            subtext="awaiting evaluations"
            trend={
              pendingCompletions > 0
                ? 'up'
                : 'neutral'
            }
            trendValue={
              pendingCompletions > 0
                ? `+${pendingCompletions}`
                : '0'
            }
            icon={Clock}
          />

          <StatCard
            title="Evaluations Completed"
            value={completedTasksCount}
            subtext="overall this semester"
            trend="neutral"
            trendValue="0"
            icon={CheckSquare}
          />
        </div>

        {/* Primary Sections */}
        <div className="grid gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2">
            <ChartCard
              title="Department Task Completion Trend"
              description="Visual analytics representation of task completions over time."
            />
          </div>

          {/* Quick Actions & Average Score */}
          <div className="space-y-6">

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm flex flex-col justify-between">

              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                  Average Evaluation Score
                </h3>

                <p className="text-xs text-slate-500 mb-4">
                  Aggregated average score across all approved member evaluations.
                </p>
              </div>

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Award className="h-6 w-6" />
                </div>

                <div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {averageRatingStr}
                  </span>

                  <span className="text-xs text-slate-400 block">
                    Club performance score
                  </span>
                </div>

              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid gap-4 grid-cols-2">

              <Link
                href="/department-lead/tasks"
                className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <PlusCircle className="h-5 w-5" />
                </div>

                <h4 className="mt-4 font-semibold text-slate-900 dark:text-white text-sm">
                  Manage Tasks
                </h4>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Publish a new task checklist or assign them.
                </p>
              </Link>

              <Link
                href="/department-lead/evaluations"
                className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <CheckSquare className="h-5 w-5" />
                </div>

                <h4 className="mt-4 font-semibold text-slate-900 dark:text-white text-sm">
                  Review Work
                </h4>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Review submitted completions and rate work.
                </p>
              </Link>

            </div>
          </div>
        </div>

        {/* Recent submissions */}
        <div className="space-y-4">

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Member Submissions
          </h3>

          <DataTable
            columns={columns}
            data={recentSubmissions}
            emptyText="No recent submissions awaiting evaluation."
          />

        </div>

      </div>
    </AppShell>
  );
}