
import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import {
  StatCard,
  DataTable,
  StatusBadge,
} from '@/components/dashboard/components';
import { getSwcClubDetail } from '@/lib/database/swc';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import {
  Users,
  Award,
  Shield,
  Mail,
  CheckSquare,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    clubId: string;
  }>;
}

interface MemberRow {
  id: string;
  fullName: string;
  email: string;
  assignedCount: number;
  completedCount: number;
  completionRate: number;
  averageRating: number;
}

interface EvaluationRow {
  id: string;
  taskTitle: string;
  memberName: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

export default async function SwcClubDetailPage({
  params,
}: PageProps) {
  const profile = await requireRole('STUDENT_WELFARE_COUNCIL');

  const userProp = {
    fullName: profile.full_name || 'SWC Council Representative',
    email: profile.email || '',
    role: profile.role,
  };

  // Next.js 16: route params must be awaited.
  const { clubId } = await params;

  const club = await getSwcClubDetail(clubId);

  if (!club) {
    return (
      <AppShell
        role="STUDENT_WELFARE_COUNCIL"
        user={userProp}
      >
        <div className="max-w-4xl mx-auto py-12 space-y-4">
          <Link
            href="/swc/clubs"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clubs Directory
          </Link>

          <EmptyState
            title="Club Not Found"
            description="The requested student club chapter could not be found or accessed."
          />
        </div>
      </AppShell>
    );
  }

  const memberColumns = [
    {
      header: 'Member Name',
      accessor: (row: MemberRow) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-white block">
            {row.fullName}
          </span>
          <span className="text-xs text-slate-550 block">
            {row.email}
          </span>
        </div>
      ),
    },
    {
      header: 'Assigned / Completed',
      accessor: (row: MemberRow) => (
        <span className="text-slate-700 dark:text-slate-350">
          {row.completedCount} / {row.assignedCount} tasks
        </span>
      ),
    },
    {
      header: 'Completion Rate',
      accessor: (row: MemberRow) => (
        <span
          className={`text-sm font-bold ${row.completionRate >= 75
            ? 'text-emerald-600'
            : row.completionRate >= 50
              ? 'text-amber-600'
              : 'text-slate-500'
            }`}
        >
          {row.completionRate}%
        </span>
      ),
    },
    {
      header: 'Average Rating',
      accessor: (row: MemberRow) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.averageRating > 0
            ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350'
            : 'bg-slate-50 dark:bg-slate-900 text-slate-500'
            }`}
        >
          ★{' '}
          {row.averageRating > 0
            ? row.averageRating.toFixed(2)
            : 'N/A'}
        </span>
      ),
    },
  ];

  const evaluationColumns = [
    {
      header: 'Task Title',
      accessor: (row: EvaluationRow) => (
        <span className="font-semibold text-slate-850 dark:text-slate-200 block truncate max-w-[200px]">
          {row.taskTitle}
        </span>
      ),
    },
    {
      header: 'Member Name',
      accessor: (row: EvaluationRow) => (
        <span className="text-sm text-slate-650 dark:text-slate-350">
          {row.memberName}
        </span>
      ),
    },
    {
      header: 'Rating Score',
      accessor: (row: EvaluationRow) => (
        <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350 px-2.5 py-0.5 text-xs font-semibold">
          ★ {row.rating}
        </span>
      ),
    },
    {
      header: 'Date Evaluated',
      accessor: (row: EvaluationRow) => (
        <span className="text-xs text-slate-550">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <AppShell
      role="STUDENT_WELFARE_COUNCIL"
      user={userProp}
    >
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Page heading */}
        <div>
          <Link
            href="/swc/clubs"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clubs Directory
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {club.name}
            </h2>

            <StatusBadge
              label={club.isActive ? 'ACTIVE' : 'INACTIVE'}
              type={club.isActive ? 'success' : 'neutral'}
            />
          </div>
        </div>

        {/* Club information */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            About Club
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-6">
            {club.description || 'No description provided for this club.'}
          </p>

          <div className="grid gap-6 md:grid-cols-2 pt-6 border-t border-slate-100 dark:border-slate-800/85">
            {/* President */}
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-650 dark:text-indigo-400">
                <Shield className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Club President
                </span>

                <span className="font-semibold text-slate-800 dark:text-slate-250 block">
                  {club.president?.fullName || 'Unassigned'}
                </span>

                {club.president && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {club.president.email}
                  </span>
                )}
              </div>
            </div>

            {/* Department Lead */}
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-650 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Department Lead
                </span>

                <span className="font-semibold text-slate-800 dark:text-slate-250 block">
                  {club.departmentLead?.fullName || 'Unassigned'}
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

        {/* Performance statistics */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Operational Summary Stats
          </h3>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Members"
              value={club.memberCount.toString()}
              subtext="enrolled in club"
              icon={Users}
            />

            <StatCard
              title="Average Rating"
              value={
                club.averageRating > 0
                  ? `★ ${club.averageRating.toFixed(2)}`
                  : 'N/A'
              }
              subtext="system evaluations score"
              icon={Award}
            />

            <StatCard
              title="Completion Rate"
              value={`${club.completionRate}%`}
              subtext="approved task submittals"
              icon={CheckSquare}
            />

            <StatCard
              title="Evaluated Count"
              value={`${club.evaluatedMembersCount} member(s)`}
              subtext="with evaluation records"
              icon={Clock}
            />
          </div>
        </div>

        {/* Member performance */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Active Members
          </h3>

          <DataTable
            columns={memberColumns}
            data={club.membersList}
            emptyText="No members currently assigned to this club."
          />
        </div>

        {/* Recent evaluations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Evaluations
          </h3>

          <DataTable
            columns={evaluationColumns}
            data={club.recentEvaluations}
            emptyText="No evaluations have been submitted for tasks in this club."
          />
        </div>
      </div>
    </AppShell>
  );
}
