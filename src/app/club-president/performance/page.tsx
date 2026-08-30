import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { getPresidentClub } from '@/lib/database/club-president';
import { getClubMembersPerformanceList, ClubMemberPerformance } from '@/lib/database/performance';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import { ClubPresidentMembersClient } from '../members/ClubPresidentMembersClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ClubPresidentPerformancePage() {
  const profile = await requireRole('CLUB_PRESIDENT');
  const club = await getPresidentClub(profile.id);

  const userProp = {
    fullName: profile.full_name || 'Club President',
    email: profile.email || '',
    role: profile.role,
  };

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

  let members: ClubMemberPerformance[] = [];
  try {
    members = await getClubMembersPerformanceList(club.id);
  } catch (err) {
    console.error('Failed to load club members performance list:', err);
  }

  return (
    <AppShell role="CLUB_PRESIDENT" user={userProp}>
      <div className="space-y-6">
        <div>
          <Link
            href="/club-president"
            className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
          >
            ← Back to Dashboard
          </Link>
          <div className="mt-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {club.name} Performance Analytics
            </h2>
            <p className="text-sm text-slate-550 dark:text-slate-400">
              View task completion metrics, evaluations counts, and aggregate rating grades.
            </p>
          </div>
        </div>

        <div className="animate-in fade-in duration-300">
          <ClubPresidentMembersClient members={members} />
        </div>
      </div>
    </AppShell>
  );
}
