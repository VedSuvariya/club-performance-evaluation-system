import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import {
  StatCard,
  SectionHeader,
  DataTable,
  ProgressIndicator,
  ActivityItem,
  ChartCard,
  QuickActionCard,
} from '@/components/dashboard/components';
import { Users, Building, ArrowLeftRight, FileBarChart, Award, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DepartmentPlaceholder {
  name: string;
  leadName: string;
  memberCount: number;
  averageScore: number;
}

const MOCK_DEPARTMENTS: DepartmentPlaceholder[] = [
  { name: 'Technical & Web Development (Demo)', leadName: 'Dave Davis', memberCount: 15, averageScore: 4.8 },
  { name: 'Creative Arts & Marketing (Demo)', leadName: 'Eva Green', memberCount: 12, averageScore: 4.5 },
  { name: 'Public Relations & Welfare (Demo)', leadName: 'Frank Miller', memberCount: 8, averageScore: 4.2 },
];

export default async function ClubPresidentPage() {
  const profile = await requireRole('CLUB_PRESIDENT');

  const userProp = {
    fullName: profile.full_name || 'Club President',
    email: profile.email || '',
    role: profile.role,
  };

  const columns = [
    {
      header: 'Department Name',
      accessor: (row: DepartmentPlaceholder) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>
      ),
    },
    {
      header: 'Department Lead',
      accessor: (row: DepartmentPlaceholder) => <span className="text-slate-600 dark:text-slate-400">{row.leadName}</span>,
    },
    {
      header: 'Members count',
      accessor: (row: DepartmentPlaceholder) => <span className="text-slate-600 dark:text-slate-400">{row.memberCount}</span>,
    },
    {
      header: 'Average Rating',
      accessor: (row: DepartmentPlaceholder) => <span className="font-semibold text-indigo-600 dark:text-indigo-400">{row.averageScore} / 5</span>,
    },
  ];

  return (
    <AppShell role="CLUB_PRESIDENT" user={userProp}>
      <div className="space-y-8">
        {/* Page Title */}
        <SectionHeader
          title="Club President Dashboard"
          description={`Welcome back, ${userProp.fullName}. Review club performance indexes, department evaluations, and active transfers.`}
        />

        {/* Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Club Members"
            value="35"
            subtext="active this semester"
            trend="up"
            trendValue="+4"
            icon={Users}
          />
          <StatCard
            title="Active Departments"
            value="3"
            subtext="with assigned leads"
            trend="neutral"
            trendValue="0"
            icon={Building}
          />
          <StatCard
            title="Overall Club Rating"
            value="4.6 / 5"
            subtext="average of all evaluations"
            trend="up"
            trendValue="+0.15"
            icon={Award}
          />
          <StatCard
            title="Pending Transfers"
            value="2"
            subtext="awaiting your decision"
            trend="up"
            trendValue="+2"
            icon={ArrowLeftRight}
          />
        </div>

        {/* Primary Sections: Chart & Progress */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard
              title="Club Performance Index Trend (Demo)"
              description="Average evaluation score trend compiled across all departments."
            />
          </div>

          {/* Quick Actions & Progress */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Target Tasks Progress</h3>
              <ProgressIndicator value={76} label="Overall Task Submissions" />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <QuickActionCard
                title="Review Transfers"
                description="Approve/reject pending transfer requests."
                icon={ArrowLeftRight}
              />
              <QuickActionCard
                title="Export Reports"
                description="Download evaluation stats summaries."
                icon={FileBarChart}
              />
            </div>
          </div>
        </div>

        {/* Tables & Recent Log Timelines */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Department Overview</h3>
            <DataTable columns={columns} data={MOCK_DEPARTMENTS} emptyText="No active departments." />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Recent Activity (Demo)</h3>
            <div className="space-y-2">
              <ActivityItem
                title="Transfer Request Received"
                description="Alice Johnson requested transfer to Technical department."
                timestamp="3 hours ago"
                icon={ArrowLeftRight}
                iconColor="text-amber-500"
              />
              <ActivityItem
                title="Monthly Report Generated"
                description="Department summaries compiled and synced."
                timestamp="1 day ago"
                icon={FileText}
                iconColor="text-emerald-500"
              />
              <ActivityItem
                title="High Rank Acknowledged"
                description="Technical Lead Dave Davis noted score peak of 4.8."
                timestamp="3 days ago"
                icon={Award}
                iconColor="text-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
