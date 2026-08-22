import { requireRole } from '@/lib/permissions';
import { getMemberTasks, TaskDetails } from '@/lib/database/tasks';
import { TaskList } from './TaskList';

export const dynamic = 'force-dynamic';

export default async function MemberTasksPage() {
  const profile = await requireRole('MEMBER');

  const userProp = {
    fullName: profile.full_name || 'Member',
    email: profile.email || '',
    role: profile.role,
  };

  let tasks: TaskDetails[] = [];
  try {
    tasks = await getMemberTasks(profile.id);
  } catch (err) {
    console.error('Failed to load member tasks', err);
  }

  return <TaskList tasks={tasks} user={userProp} />;
}
