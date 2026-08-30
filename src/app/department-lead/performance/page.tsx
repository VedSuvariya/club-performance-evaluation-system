import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { getLeadClub } from '@/lib/database/department-lead';
import { getClubMembersPerformanceList, ClubMemberPerformance } from '@/lib/database/performance';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import { ClubPerformanceClient } from './ClubPerformanceClient';

export const dynamic = 'force-dynamic';

export default async function DepartmentLeadPerformancePage() {
  const profile = await requireRole('DEPARTMENT_LEAD');

  const userProp = {
    fullName: profile.full_name || 'Department Lead',
    email: profile.email || '',
    role: profile.role,
  };

  const club = await getLeadClub(profile.id);

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

  let members: ClubMemberPerformance[] = [];
  try {
    members = await getClubMembersPerformanceList(club.id);
  } catch (err) {
    console.error('Failed to load club members performance list:', err);
  }

  return (
    <AppShell role="DEPARTMENT_LEAD" user={userProp}>
      <div className="animate-in fade-in duration-300">
        <ClubPerformanceClient members={members} />
      </div>
    </AppShell>
  );
}
