import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import {
  StatCard,
  SectionHeader,
  DataTable,
  ProgressIndicator,
  ActivityItem,
  QuickActionCard,
} from '@/components/dashboard/components';
import { Users, ArrowLeftRight, FileBarChart, Award, FileText, CheckSquare } from 'lucide-react';
import { getPresidentClub, getPresidentDashboardData } from '@/lib/database/club-president';
import { getClubMembersPerformanceList, ClubMemberPerformance } from '@/lib/database/performance';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ClubPresidentPage() {
  const profile = await requireRole('CLUB_PRESIDENT');

  const userProp = {
    fullName: profile.full_name || 'Club President',
    email: profile.email || '',
    role: profile.role,
  };

  // 1. Resolve President's club
  const club = await getPresidentClub(profile.id);

  if (!club) {
    return (
      <AppShell role="CLUB_PRESIDENT" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="No Managed Club"
            description="You are not currently assigned as president of any club."
          />
        </div>
      </AppShell>
    );
  }

  // 2. Fetch dashboard data
  let dashboardData;
  let members: ClubMemberPerformance[] = [];
  try {
    dashboardData = await getPresidentDashboardData(club.id);
    members = await getClubMembersPerformanceList(club.id);
  } catch (err) {
    console.error('Failed to fetch dashboard data', err);
    return (
      <AppShell role="CLUB_PRESIDENT" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="Error Loading Data"
            description="There was a problem loading your club's statistics. Please try again later."
          />
        </div>
      </AppShell>
    );
  }

  const {
    memberCount,
    totalAssigned,
    totalCompleted,
    completionRate,
    averageRating,
    activeTasksCount,
    pendingTransfersCount,
    recentActivity,
  } = dashboardData;

  const columns = [
    {
      header: 'Member Name',
      accessor: (row: ClubMemberPerformance) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{row.fullName}</span>
          <span className="text-xs text-slate-500 block truncate max-w-[150px]">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Assigned / Completed',
      accessor: (row: ClubMemberPerformance) => (
        <span className="text-slate-650 dark:text-slate-350">
          {row.completedCount} / {row.assignedCount} tasks
        </span>
      ),
    },
    {
      header: 'Completion Rate',
      accessor: (row: ClubMemberPerformance) => (
        <span className={`text-sm font-semibold ${row.completionRate >= 75 ? 'text-emerald-600' : row.completionRate >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
          {row.completionRate}%
        </span>
      ),
    },
    {
      header: 'Average Rating',
      accessor: (row: ClubMemberPerformance) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${row.averageRating > 0 ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350' : 'bg-slate-50 dark:bg-slate-900 text-slate-500'}`}>
          ★ {row.averageRating > 0 ? row.averageRating.toFixed(2) : 'N/A'}
        </span>
      ),
    },
  ];

  return (
    <AppShell role="CLUB_PRESIDENT" user={userProp}>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Page Title */}
        <SectionHeader
          title={`President of ${club.name}`}
          description={`Review performance indexes, member evaluations, and pending administrative tasks.`}
        />

        {/* Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Club Members"
            value={memberCount.toString()}
            subtext="active memberships"
            icon={Users}
          />
          <StatCard
            title="Active Tasks"
            value={activeTasksCount.toString()}
            subtext="currently in progress"
            icon={CheckSquare}
          />
          <StatCard
            title="Overall Club Rating"
            value={averageRating > 0 ? `★ ${averageRating.toFixed(2)}` : 'N/A'}
            subtext="average of all evaluations"
            icon={Award}
          />
          <StatCard
            title="Pending Transfers"
            value={pendingTransfersCount.toString()}
            subtext="requests awaiting review"
            icon={ArrowLeftRight}
          />
        </div>

        {/* Quick Actions & Progress */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Club Details</h3>
              <p className="text-sm text-slate-600 dark:text-slate-350 line-clamp-3 mb-4">
                {club.description || 'No club description provided.'}
              </p>
              <div className="text-xs text-slate-500 space-y-1">
                <div>
                  <strong>Department Lead:</strong> {club.departmentLead?.fullName || 'None assigned'}
                </div>
                {club.departmentLead && (
                  <div className="truncate">({club.departmentLead.email})</div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <Link href="/club-president/club" className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
                View Full Club Overview →
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Task Submission Progress</h3>
              <ProgressIndicator value={completionRate} label="Overall Task Submissions" />
              <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg">
                  <span className="text-xs text-slate-550 block">Approved</span>
                  <span className="text-lg font-bold text-slate-850 dark:text-white">{totalCompleted}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg">
                  <span className="text-xs text-slate-550 block">Assigned</span>
                  <span className="text-lg font-bold text-slate-850 dark:text-white">{totalAssigned}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 grid-cols-2">
            <Link href="/club-president/club-transfers" className="block w-full">
              <QuickActionCard
                title="Review Transfers"
                description={`${pendingTransfersCount} request(s) awaiting your decision.`}
                icon={ArrowLeftRight}
              />
            </Link>
            <Link href="/club-president/reports" className="block w-full">
              <QuickActionCard
                title="Club Reports"
                description="Generate performance summaries."
                icon={FileBarChart}
              />
            </Link>
          </div>
        </div>

        {/* Members Overview & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Active Club Members</h3>
              <Link href="/club-president/members" className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
                Manage Members →
              </Link>
            </div>
            <DataTable columns={columns} data={members.slice(0, 5)} emptyText="No active members in this club." />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Recent Activity Log</h3>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No recent activity logged for this club.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  let icon = FileText;
                  let color = 'text-emerald-500';
                  if (activity.type === 'EVALUATION') {
                    icon = Award;
                    color = 'text-indigo-500';
                  } else if (activity.type === 'TRANSFER') {
                    icon = ArrowLeftRight;
                    color = 'text-amber-500';
                  }
                  return (
                    <ActivityItem
                      key={activity.id}
                      title={activity.title}
                      description={activity.description}
                      timestamp={new Date(activity.timestamp).toLocaleDateString()}
                      icon={icon}
                      iconColor={color}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
