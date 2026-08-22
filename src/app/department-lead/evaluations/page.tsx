import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { getLeadClub } from '@/lib/database/department-lead';
import { getPendingEvaluations, getEvaluatedTasks, ClubEvaluationDetails } from '@/lib/database/evaluations';
import { ClubCompletionDetails } from '@/lib/database/department-lead';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import { EvaluationsClient } from './EvaluationsClient';

export const dynamic = 'force-dynamic';

export default async function DepartmentEvaluationsPage() {
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

  let pending: ClubCompletionDetails[] = [];
  let evaluated: ClubEvaluationDetails[] = [];
  try {
    pending = await getPendingEvaluations(club.id);
    evaluated = await getEvaluatedTasks(club.id);
  } catch (err) {
    console.error('Failed to load completions or evaluations:', err);
  }

  return (
    <AppShell role="DEPARTMENT_LEAD" user={userProp}>
      <div className="animate-in fade-in duration-300">
        <EvaluationsClient completions={pending} evaluated={evaluated} />
      </div>
    </AppShell>
  );
}
