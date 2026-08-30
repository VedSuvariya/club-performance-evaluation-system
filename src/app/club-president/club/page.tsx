import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader, StatCard, DataTable } from '@/components/dashboard/components';
import { getPresidentClub } from '@/lib/database/club-president';
import { getClubSummaryStats } from '@/lib/database/reports';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import { Users, Award, Shield, Mail, CheckSquare, Clock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ClubPresidentOverviewPage() {
  const profile = await requireRole('CLUB_PRESIDENT');

  const userProp = {
    fullName: profile.full_name || 'Club President',
    email: profile.email || '',
    role: profile.role,
  };

  const club = await getPresidentClub(profile.id);

  if (!club) {
    return (
      <AppShell role="CLUB_PRESIDENT" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="No Managed Club"
            description="You are not currently assigned to manage any club."
          />
        </div>
      </AppShell>
    );
  }

  const stats = await getClubSummaryStats(club.id);

  if (!stats) {
    return (
      <AppShell role="CLUB_PRESIDENT" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="Error Loading Stats"
            description="Could not compile performance summary statistics for your club."
          />
        </div>
      </AppShell>
    );
  }

  interface EvaluationRow {
    id: string;
    taskTitle: string;
    memberName: string;
    rating: number;
    feedback: string;
    createdAt: string;
  }

  const evaluationColumns = [
    {
      header: 'Task Title',
      accessor: (row: EvaluationRow) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">{row.taskTitle}</span>
      ),
    },
    {
      header: 'Member Name',
      accessor: (row: EvaluationRow) => (
        <span className="text-sm text-slate-650 dark:text-slate-350">{row.memberName}</span>
      ),
    },
    {
      header: 'Rating Score',
      accessor: (row: EvaluationRow) => (
        <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350 px-2 py-0.5 text-xs font-semibold">
          ★ {row.rating}
        </span>
      ),
    },
    {
      header: 'Date Evaluated',
      accessor: (row: EvaluationRow) => (
        <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <AppShell role="CLUB_PRESIDENT" user={userProp}>
      <div className="space-y-8 animate-in fade-in duration-300">
        <div>
          <Link
            href="/club-president"
            className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
          >
            ← Back to Dashboard
          </Link>
          <SectionHeader
            title={`${club.name} - Detailed Overview`}
            description="Complete operational overview, leadership directory, and aggregate evaluations."
          />
        </div>

        {/* Club Details Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">About {club.name}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-6">
            {club.description || 'No description provided for this club.'}
          </p>

          <div className="grid gap-6 md:grid-cols-2 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            {/* President Info */}
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-600 dark:text-indigo-455">
                <Shield className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Club President</span>
                <span className="font-semibold text-slate-800 dark:text-slate-250 block">{userProp.fullName}</span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {userProp.email}
                </span>
              </div>
            </div>

            {/* Department Lead Info */}
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-600 dark:text-indigo-455">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Department Lead</span>
                <span className="font-semibold text-slate-800 dark:text-slate-250 block">
                  {club.departmentLead?.fullName || 'No Lead Assigned'}
                </span>
                {club.departmentLead && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {club.departmentLead.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Aggregated Performance Metrics */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Operational Summary Stats
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Members"
              value={stats.memberCount.toString()}
              subtext="enrolled in club"
              icon={Users}
            />
            <StatCard
              title="Average Rating"
              value={stats.averageRating > 0 ? `★ ${stats.averageRating.toFixed(2)}` : 'N/A'}
              subtext="system evaluations score"
              icon={Award}
            />
            <StatCard
              title="Completion Rate"
              value={`${stats.completionRate}%`}
              subtext="approved task submittals"
              icon={CheckSquare}
            />
            <StatCard
              title="Evaluated Count"
              value={`${stats.evaluatedMembersCount} member(s)`}
              subtext="with evaluation records"
              icon={Clock}
            />
          </div>
        </div>

        {/* Recent Evaluations Log */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Evaluation Entries</h3>
          <DataTable
            columns={evaluationColumns}
            data={stats.recentEvaluations}
            emptyText="No evaluations have been submitted for tasks in this club."
          />
        </div>
      </div>
    </AppShell>
  );
}
