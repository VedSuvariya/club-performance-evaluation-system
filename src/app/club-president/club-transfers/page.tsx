import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { getPendingTransferRequests } from '@/lib/database/club-transfers';
import { getPresidentClub } from '@/lib/database/club-president';
import { ClubTransfersClient } from './ClubTransfersClient';
import { EmptyState } from '@/components/feedback/FeedbackStates';

export const dynamic = 'force-dynamic';

export default async function ClubPresidentTransfersPage() {
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

  // Fetch pending transfer requests scoped to the managed club
  const pendingRequests = await getPendingTransferRequests(club.id);

  return (
    <AppShell role="CLUB_PRESIDENT" user={userProp}>
      <div className="animate-in fade-in duration-300">
        <ClubTransfersClient pendingRequests={pendingRequests} />
      </div>
    </AppShell>
  );
}
