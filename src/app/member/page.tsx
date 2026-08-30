import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import {
  StatCard,
  SectionHeader,
  DataTable,
  StatusBadge,
  ProgressIndicator,
  ActivityItem,
  QuickActionCard,
} from '@/components/dashboard/components';
import { getMemberTasks, TaskDetails } from '@/lib/database/tasks';
import { getMemberPerformanceSummary } from '@/lib/database/performance';
import { getMemberTransferHistory, TransferRequest } from '@/lib/database/club-transfers';
import { CheckSquare, Clock, FileText, ArrowLeftRight, HelpCircle, Award, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/feedback/FeedbackStates';

export const dynamic = 'force-dynamic';

interface TaskRow {
  id: string;
  title: string;
  dueDate: string;
  statusLabel: string;
  statusType: 'success' | 'warning' | 'error' | 'info';
}

export default async function MemberPage() {
  const profile = await requireRole('MEMBER');

  const userProp = {
    fullName: profile.full_name || 'Member',
    email: profile.email || '',
    role: profile.role,
  };

  // Fetch real task data
  let tasks: TaskDetails[] = [];
  try {
    tasks = await getMemberTasks(profile.id);
  } catch (err) {
    console.error('Failed to load member tasks', err);
  }

  // Fetch real performance data
  let performanceSummary = {
    totalAssigned: 0,
    totalCompleted: 0,
    totalEvaluated: 0,
    pendingEvaluations: 0,
    completionRate: 0,
    averageRating: 0,
  };
  try {
    performanceSummary = await getMemberPerformanceSummary(profile.id);
  } catch (err) {
    console.error('Failed to load performance summary', err);
  }

  // Fetch transfer history to see if a transfer request is pending
  let transferHistory: TransferRequest[] = [];
  try {
    transferHistory = await getMemberTransferHistory(profile.id);
  } catch (err) {
    console.error('Failed to load transfer history', err);
  }
  const pendingTransfer = transferHistory.find((t) => t.status === 'PENDING');

  // Calculate task status statistics for the dashboard
  const now = new Date();

  // Filter and sort upcoming pending tasks
  const upcomingTasksData = tasks
    .filter((t) => t.completion === null)
    .sort((a, b) => {
      if (!a.task.dueDate) return 1;
      if (!b.task.dueDate) return -1;
      return new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime();
    })
    .slice(0, 3);

  const mappedUpcomingTasks: TaskRow[] = upcomingTasksData.map((t) => {
    const isOverdue = t.task.dueDate ? new Date(t.task.dueDate) < now : false;
    return {
      id: t.task.id,
      title: t.task.title,
      dueDate: t.task.dueDate ? new Date(t.task.dueDate).toLocaleDateString() : 'No due date',
      statusLabel: isOverdue ? 'OVERDUE' : 'PENDING',
      statusType: isOverdue ? 'error' : 'warning',
    };
  });

  const columns = [
    {
      header: 'Task Title',
      accessor: (row: TaskRow) => (
        <Link
          href={`/member/tasks/${row.id}`}
          className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition"
        >
          {row.title}
        </Link>
      ),
    },
    {
      header: 'Due Date',
      accessor: (row: TaskRow) => <span className="text-xs text-slate-500">{row.dueDate}</span>,
    },
    {
      header: 'Status',
      accessor: (row: TaskRow) => (
        <StatusBadge label={row.statusLabel} type={row.statusType} />
      ),
    },
  ];

  const completionPercentage = performanceSummary.completionRate;

  return (
    <AppShell role="MEMBER" user={userProp}>
      <div className="space-y-8">
        {/* Page title */}
        <SectionHeader
          title="Member Dashboard"
          description={`Welcome back, ${userProp.fullName}. Track your tasks, ratings, and performance details.`}
          actions={
            <Link
              href="/member/performance"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <TrendingUp className="h-4 w-4" />
              View Performance
            </Link>
          }
        />

        {pendingTransfer && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 flex items-start gap-3 shadow-sm animate-pulse">
            <ArrowLeftRight className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-850 dark:text-amber-300">
                Transfer Request Pending
              </h4>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 leading-normal">
                You have requested a transfer to <span className="font-semibold text-amber-950 dark:text-amber-200">{pendingTransfer.newClubName}</span> on{' '}
                <span className="font-semibold">{new Date(pendingTransfer.createdAt).toLocaleDateString()}</span>. Your request is currently under review by the Club President.
              </p>
            </div>
          </div>
        )}

        {/* Concise Performance Overview Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Average Rating"
            value={performanceSummary.averageRating > 0 ? `★ ${performanceSummary.averageRating.toFixed(2)}` : 'N/A'}
            subtext="overall performance index"
            trend="neutral"
            trendValue="--"
            icon={Award}
          />
          <StatCard
            title="Completion Rate"
            value={`${performanceSummary.completionRate}%`}
            subtext="ratio of completions"
            trend={performanceSummary.completionRate >= 75 ? 'up' : 'neutral'}
            trendValue="--"
            icon={TrendingUp}
          />
          <StatCard
            title="Evaluated Tasks"
            value={performanceSummary.totalEvaluated.toString()}
            subtext="rated by department lead"
            trend="neutral"
            trendValue="--"
            icon={CheckSquare}
          />
          <StatCard
            title="Awaiting Evaluation"
            value={performanceSummary.pendingEvaluations.toString()}
            subtext="completed but pending review"
            trend={performanceSummary.pendingEvaluations > 0 ? 'up' : 'neutral'}
            trendValue={performanceSummary.pendingEvaluations.toString()}
            icon={Clock}
          />
        </div>

        {/* Dashboard Layout: Tasks & Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Upcoming Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Tasks</h3>
              <Link
                href="/member/tasks"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
              >
                View All Tasks &rarr;
              </Link>
            </div>
            {mappedUpcomingTasks.length > 0 ? (
              <DataTable columns={columns} data={mappedUpcomingTasks} emptyText="No tasks assigned." />
            ) : (
              <EmptyState
                title="All caught up!"
                description="You have no pending tasks assigned at this moment."
                actionLabel="View Task History"
                onAction={() => {}}
                className="bg-transparent"
              />
            )}
          </div>

          {/* Right Column: Progress, Quick Actions, and Activity */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Overall Completion Progress</h3>
              <ProgressIndicator value={completionPercentage} label="Semester Goal Progress" />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <Link href="/member/club-transfer" className="block w-full">
                <QuickActionCard
                  title="Request Transfer"
                  description="Apply to transfer to a different club department."
                  icon={ArrowLeftRight}
                />
              </Link>
              <QuickActionCard
                title="Get Help"
                description="View documentation and system support instructions."
                icon={HelpCircle}
              />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {performanceSummary.totalCompleted > 0 ? (
                  <ActivityItem
                    title="Tasks Completed"
                    description={`You successfully completed ${performanceSummary.totalCompleted} task(s).`}
                    timestamp="Recently updated"
                    icon={CheckSquare}
                    iconColor="text-emerald-500"
                  />
                ) : null}
                <ActivityItem
                  title="Welcome to Dashboard"
                  description="Your dashboard has been synchronized with the database."
                  timestamp="Just now"
                  icon={FileText}
                  iconColor="text-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
