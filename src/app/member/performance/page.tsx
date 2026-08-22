import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { getMemberPerformanceSummary } from '@/lib/database/performance';
import { MemberPerformanceClient } from './MemberPerformanceClient';

export const dynamic = 'force-dynamic';

export default async function MemberPerformancePage() {
  const profile = await requireRole('MEMBER');

  const userProp = {
    fullName: profile.full_name || 'Member',
    email: profile.email || '',
    role: profile.role,
  };

  const summary = await getMemberPerformanceSummary(profile.id);

  return (
    <AppShell role="MEMBER" user={userProp}>
      <div className="animate-in fade-in duration-300">
        <MemberPerformanceClient summary={summary} />
      </div>
    </AppShell>
  );
}
