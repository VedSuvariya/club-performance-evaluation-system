import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { getMemberEvaluations, MemberEvaluationDetails } from '@/lib/database/evaluations';
import { MemberEvaluationsClient } from './MemberEvaluationsClient';

export const dynamic = 'force-dynamic';

export default async function MemberEvaluationsPage() {
  const profile = await requireRole('MEMBER');

  const userProp = {
    fullName: profile.full_name || 'Member',
    email: profile.email || '',
    role: profile.role,
  };

  let evaluations: MemberEvaluationDetails[] = [];
  try {
    evaluations = await getMemberEvaluations(profile.id);
  } catch (err) {
    console.error('Failed to load member evaluations:', err);
  }

  return (
    <AppShell role="MEMBER" user={userProp}>
      <div className="animate-in fade-in duration-300">
        <MemberEvaluationsClient evaluations={evaluations} />
      </div>
    </AppShell>
  );
}
