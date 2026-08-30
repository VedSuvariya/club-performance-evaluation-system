import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/dashboard/components';
import { getPresidentClub } from '@/lib/database/club-president';
import { getClubMembersPerformanceList, ClubMemberPerformance } from '@/lib/database/performance';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import { ClubPresidentMembersClient } from './ClubPresidentMembersClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ClubPresidentMembersPage() {
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
    console.error('Failed to load club members:', err);
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
          <SectionHeader
            title="Club Member Directory"
            description={`Manage members of ${club.name}. Review their work details, completion scores, and evaluations.`}
          />
        </div>

        <div className="animate-in fade-in duration-300">
          <ClubPresidentMembersClient members={members} />
        </div>
      </div>
    </AppShell>
  );
}
