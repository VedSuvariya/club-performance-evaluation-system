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
import { Building, Award, FileText, ArrowLeftRight } from 'lucide-react';
import { getSwcDashboardData, getClubsDirectoryData, ClubDirectoryItem } from '@/lib/database/swc';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SwcPage() {
  const profile = await requireRole('STUDENT_WELFARE_COUNCIL');

  const userProp = {
    fullName: profile.full_name || 'SWC Council Representative',
    email: profile.email || '',
    role: profile.role,
  };

  const dashboardData = await getSwcDashboardData();
  const clubs = await getClubsDirectoryData();

  const {
    totalClubsCount,
    activeClubsCount,
    overallAverageRating,
    overallCompletionRate,
    recentReportsCount,
    recentTransfersCount,
    recentActivity,
  } = dashboardData;

  const columns = [
    {
      header: 'Club Name',
      accessor: (row: ClubDirectoryItem) => (
        <Link
          href={`/swc/clubs/${row.id}`}
          className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-650 hover:underline transition"
        >
          {row.name}
        </Link>
      ),
    },
    {
      header: 'Club President',
      accessor: (row: ClubDirectoryItem) => (
        <span className="text-slate-600 dark:text-slate-400">{row.presidentName}</span>
      ),
    },
    {
      header: 'Active Members',
      accessor: (row: ClubDirectoryItem) => (
        <span className="text-slate-650 dark:text-slate-350">{row.memberCount}</span>
      ),
    },
    {
      header: 'Overall Rating',
      accessor: (row: ClubDirectoryItem) => (
        <span className={`font-semibold ${row.averageRating > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
          {row.averageRating > 0 ? `★ ${row.averageRating.toFixed(2)}` : 'N/A'}
        </span>
      ),
    },
  ];

  return (
    <AppShell role="STUDENT_WELFARE_COUNCIL" user={userProp}>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Page Title */}
        <SectionHeader
          title="Student Welfare Council Dashboard"
          description={`Welcome back, ${userProp.fullName}. Globally audit all registered student clubs, review aggregate scores, and view logs.`}
        />

        {/* Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Registered Clubs"
            value={totalClubsCount.toString()}
            subtext={`${activeClubsCount} currently active`}
            icon={Building}
          />
          <StatCard
            title="Total Reports"
            value={recentReportsCount.toString()}
            subtext="compiled globally"
            icon={FileText}
          />
          <StatCard
            title="Pending Transfers"
            value={recentTransfersCount.toString()}
            subtext="requests in system"
            icon={ArrowLeftRight}
          />
          <StatCard
            title="System Average Score"
            value={overallAverageRating > 0 ? `★ ${overallAverageRating.toFixed(2)}` : 'N/A'}
            subtext="aggregate rating metric"
            icon={Award}
          />
        </div>

        {/* Primary Sections: Chart & Progress */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Council Summary</h3>
              <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed mb-4">
                The SWC monitors student chapters to ensure high performance, activity engagement, and prompt member evaluation. Select a club below to inspect detail sheets.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Link href="/swc/clubs" className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
                View Clubs Directory →
              </Link>
              <Link href="/swc/performance" className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition text-right">
                View Comparisons →
              </Link>
            </div>
          </div>

          {/* Quick Actions & Progress */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Welfare System Audits</h3>
              <ProgressIndicator value={overallCompletionRate} label="Global Task Completion Rate" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 grid-cols-2">
            <Link href="/swc/clubs" className="block w-full">
              <QuickActionCard
                title="Clubs Directory"
                description="Browse all registered chapters."
                icon={Building}
              />
            </Link>
            <Link href="/swc/reports" className="block w-full">
              <QuickActionCard
                title="System Reports"
                description="Generate performance summaries."
                icon={FileText}
              />
            </Link>
          </div>
        </div>

        {/* Tables & Recent Log Timelines */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Active Student Clubs</h3>
              <Link href="/swc/clubs" className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
                View All Clubs →
              </Link>
            </div>
            <DataTable columns={columns} data={clubs.slice(0, 5)} emptyText="No registered clubs found." />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Recent System Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No recent system activity logged.</p>
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
