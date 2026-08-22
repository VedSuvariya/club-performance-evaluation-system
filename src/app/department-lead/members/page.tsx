import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader, DataTable, StatusBadge } from '@/components/dashboard/components';
import { getLeadClub, getClubMembersWithStats, ClubMemberStats } from '@/lib/database/department-lead';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ClubMembersPage() {
  const profile = await requireRole('DEPARTMENT_LEAD');
  const club = await getLeadClub(profile.id);

  const userProp = {
    fullName: profile.full_name || 'Department Lead',
    email: profile.email || '',
    role: profile.role,
  };

  if (!club) {
    return (
      <AppShell role="DEPARTMENT_LEAD" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="No Club Assigned"
            description="You are not currently assigned to manage any club."
          />
        </div>
      </AppShell>
    );
  }

  let members: ClubMemberStats[] = [];
  try {
    members = await getClubMembersWithStats(club.id);
  } catch (err) {
    console.error('Failed to load club members:', err);
  }

  const columns = [
    {
      header: 'Member Name',
      accessor: (row: ClubMemberStats) => (
        <Link
          href={`/department-lead/members/${row.id}`}
          className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition"
        >
          {row.fullName}
        </Link>
      ),
    },
    {
      header: 'Email',
      accessor: (row: ClubMemberStats) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">{row.email}</span>
      ),
    },
    {
      header: 'Assigned',
      accessor: (row: ClubMemberStats) => (
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {row.assignedCount}
        </span>
      ),
    },
    {
      header: 'Completed',
      accessor: (row: ClubMemberStats) => (
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {row.completedCount}
        </span>
      ),
    },
    {
      header: 'Pending',
      accessor: (row: ClubMemberStats) => (
        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          {row.pendingCount}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: ClubMemberStats) => (
        <StatusBadge label={row.status} type={row.status === 'ACTIVE' ? 'success' : 'neutral'} />
      ),
    },
    {
      header: 'Joined Date',
      accessor: (row: ClubMemberStats) => (
        <span className="text-xs text-slate-500">
          {new Date(row.joinedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <AppShell role="DEPARTMENT_LEAD" user={userProp}>
      <div className="space-y-6">
        <SectionHeader
          title="Club Members"
          description={`Manage members belonging to ${club.name}. Review their performance stats and task progression.`}
        />

        <div className="animate-in fade-in duration-300">
          <DataTable
            columns={columns}
            data={members}
            emptyText="No active members found in this club."
          />
        </div>
      </div>
    </AppShell>
  );
}
