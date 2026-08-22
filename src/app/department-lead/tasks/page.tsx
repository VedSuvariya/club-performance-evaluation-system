import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { getLeadClub, getClubTasks, getClubMembersWithStats, ClubTaskDetails, ClubMemberStats } from '@/lib/database/department-lead';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import { TaskManagementClient } from './TaskManagementClient';

export const dynamic = 'force-dynamic';

export default async function DepartmentTasksPage() {
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

  let tasks: ClubTaskDetails[] = [];
  let members: ClubMemberStats[] = [];
  try {
    tasks = await getClubTasks(club.id);
    members = await getClubMembersWithStats(club.id);
  } catch (err) {
    console.error('Failed to load tasks and members:', err);
  }

  return (
    <AppShell role="DEPARTMENT_LEAD" user={userProp}>
      <div className="animate-in fade-in duration-300">
        <TaskManagementClient initialTasks={tasks} members={members} />
      </div>
    </AppShell>
  );
}
