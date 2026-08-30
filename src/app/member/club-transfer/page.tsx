import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import {
  getCurrentMembership,
  getAvailableClubs,
  getMemberTransferHistory,
} from '@/lib/database/club-transfers';
import { ClubTransferClient } from './ClubTransferClient';

export const dynamic = 'force-dynamic';

export default async function MemberClubTransferPage() {
  const profile = await requireRole('MEMBER');

  const userProp = {
    fullName: profile.full_name || 'Member',
    email: profile.email || '',
    role: profile.role,
  };

  // Fetch current active membership
  const currentMembership = await getCurrentMembership(profile.id);

  // Fetch available target clubs (excludes the current club)
  const availableClubs = await getAvailableClubs(currentMembership?.clubId || null);

  // Fetch member's transfer history
  const transferHistory = await getMemberTransferHistory(profile.id);

  return (
    <AppShell role="MEMBER" user={userProp}>
      <div className="animate-in fade-in duration-300">
        <ClubTransferClient
          currentMembership={currentMembership}
          availableClubs={availableClubs}
          transferHistory={transferHistory}
        />
      </div>
    </AppShell>
  );
}
