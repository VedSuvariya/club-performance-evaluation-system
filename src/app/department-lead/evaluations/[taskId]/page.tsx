import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { getLeadClub } from '@/lib/database/department-lead';
import { getEvaluationDetail } from '@/lib/database/evaluations';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import { EvaluationDetailClient } from './EvaluationDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ memberId?: string }>;
}

export default async function EvaluationDetailPage({ params, searchParams }: PageProps) {
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

  const { taskId } = await params;
  const resolvedSearchParams = await searchParams;
  const memberId = resolvedSearchParams.memberId;

  if (!memberId) {
    return (
      <AppShell role="DEPARTMENT_LEAD" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="Missing Member Parameter"
            description="A valid member ID must be supplied to view completion details."
          />
        </div>
      </AppShell>
    );
  }

  // Retrieve detail context - automatically enforces club isolation boundaries server-side
  const detail = await getEvaluationDetail(club.id, taskId, memberId);

  if (!detail) {
    return (
      <AppShell role="DEPARTMENT_LEAD" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="Unauthorized Access"
            description="The requested task completion does not exist or does not belong to your club department."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="DEPARTMENT_LEAD" user={userProp}>
      <div className="animate-in fade-in duration-300">
        <EvaluationDetailClient detail={detail} />
      </div>
    </AppShell>
  );
}
