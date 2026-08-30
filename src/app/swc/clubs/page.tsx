import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/dashboard/components';
import { getClubsDirectoryData } from '@/lib/database/swc';
import { SwcClubsClient } from './SwcClubsClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SwcClubsPage() {
  const profile = await requireRole('STUDENT_WELFARE_COUNCIL');
  const clubs = await getClubsDirectoryData();

  const userProp = {
    fullName: profile.full_name || 'SWC Council Representative',
    email: profile.email || '',
    role: profile.role,
  };

  return (
    <AppShell role="STUDENT_WELFARE_COUNCIL" user={userProp}>
      <div className="space-y-6">
        <div>
          <Link
            href="/swc"
            className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
          >
            ← Back to Dashboard
          </Link>
          <SectionHeader
            title="Registered Student Clubs Directory"
            description="Globally review and monitor all active and inactive student chapters, leadership structures, and overall performances."
          />
        </div>

        <div className="animate-in fade-in duration-300">
          <SwcClubsClient clubs={clubs} />
        </div>
      </div>
    </AppShell>
  );
}
