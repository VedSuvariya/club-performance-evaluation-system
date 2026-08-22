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
import { Building, Users, Award, FileText, PlusCircle, CheckSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ClubPlaceholder {
  name: string;
  presidentName: string;
  activeMembers: number;
  overallRating: number;
}

const MOCK_CLUBS: ClubPlaceholder[] = [
  { name: 'Google Developer Student Club (Demo)', presidentName: 'Grace Hopper', activeMembers: 45, overallRating: 4.8 },
  { name: 'IEEE Student Branch (Demo)', presidentName: 'Nikola Tesla', activeMembers: 38, overallRating: 4.6 },
  { name: 'Coding & Algorithms Society (Demo)', presidentName: 'Ada Lovelace', activeMembers: 30, overallRating: 4.3 },
];

export default async function SwcPage() {
  const profile = await requireRole('STUDENT_WELFARE_COUNCIL');

  const userProp = {
    fullName: profile.full_name || 'SWC Council Representative',
    email: profile.email || '',
    role: profile.role,
  };

  const columns = [
    {
      header: 'Club Name',
      accessor: (row: ClubPlaceholder) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>
      ),
    },
    {
      header: 'Club President',
      accessor: (row: ClubPlaceholder) => <span className="text-slate-600 dark:text-slate-400">{row.presidentName}</span>,
    },
    {
      header: 'Active Members',
      accessor: (row: ClubPlaceholder) => <span className="text-slate-600 dark:text-slate-400">{row.activeMembers}</span>,
    },
    {
      header: 'Overall Rating',
      accessor: (row: ClubPlaceholder) => <span className="font-semibold text-indigo-600 dark:text-indigo-400">{row.overallRating} / 5</span>,
    },
  ];

  return (
    <AppShell role="STUDENT_WELFARE_COUNCIL" user={userProp}>
      <div className="space-y-8">
        {/* Page Title */}
        <SectionHeader
          title="Student Welfare Council Dashboard"
          description={`Welcome back, ${userProp.fullName}. Globally audit all registered student clubs, review aggregate scores, and view logs.`}
        />

        {/* Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Registered Clubs"
            value="12"
            subtext="active this academic year"
            trend="up"
            trendValue="+2"
            icon={Building}
          />
          <StatCard
            title="Active System Users"
            value="240"
            subtext="registered members"
            trend="up"
            trendValue="+24"
            icon={Users}
          />
          <StatCard
            title="Total Evaluations"
            value="156"
            subtext="completed system-wide"
            trend="up"
            trendValue="+45"
            icon={CheckSquare}
          />
          <StatCard
            title="System Average Score"
            value="4.52 / 5"
            subtext="aggregate rating metric"
            trend="up"
            trendValue="+0.05"
            icon={Award}
          />
        </div>

        {/* Primary Sections: Chart & Progress */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard
              title="System-wide Club Performance Averages (Demo)"
              description="Comparison of aggregate scores across all registered student chapters."
            />
          </div>

          {/* Quick Actions & Progress */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Welfare System Audits</h3>
              <ProgressIndicator value={85} label="Global Evaluation Completion Rate" />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <QuickActionCard
                title="Register Club"
                description="Initialize a new student club charter."
                icon={PlusCircle}
              />
              <QuickActionCard
                title="Global Audit"
                description="Export all evaluation and rating details."
                icon={FileText}
              />
            </div>
          </div>
        </div>

        {/* Tables & Recent Log Timelines */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Active Student Clubs</h3>
            <DataTable columns={columns} data={MOCK_CLUBS} emptyText="No registered clubs." />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Recent Activity (Demo)</h3>
            <div className="space-y-2">
              <ActivityItem
                title="New Club Chartered"
                description="Google Developer Student Club chartered successfully."
                timestamp="2 days ago"
                icon={PlusCircle}
                iconColor="text-emerald-500"
              />
              <ActivityItem
                title="Global Report Sync"
                description="System evaluation averages updated."
                timestamp="3 days ago"
                icon={FileText}
                iconColor="text-indigo-500"
              />
              <ActivityItem
                title="President Registered"
                description="Grace Hopper assigned as GDSC President."
                timestamp="1 week ago"
                icon={Users}
                iconColor="text-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
