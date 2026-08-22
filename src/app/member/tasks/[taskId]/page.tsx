import { requireRole } from '@/lib/permissions';
import { getMemberTaskDetailAction } from '@/features/task-management/actions';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/dashboard/components';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Calendar, Building, FileText, CheckCircle2 } from 'lucide-react';
import { CompletionForm } from './CompletionForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const profile = await requireRole('MEMBER');
  const { taskId } = await params;

  const userProp = {
    fullName: profile.full_name || 'Member',
    email: profile.email || '',
    role: profile.role,
  };

  // Fetch the task assignment detail (enforces member authorization server-side)
  const taskDetails = await getMemberTaskDetailAction(taskId);

  if (!taskDetails) {
    notFound();
  }

  const { task, completion, assignedAt } = taskDetails;

  // Determine current display status
  let statusLabel = 'PENDING';
  let statusType: 'success' | 'warning' | 'error' | 'info' = 'warning';
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;

  if (completion) {
    const typeMap = {
      APPROVED: 'success' as const,
      SUBMITTED: 'info' as const,
      REJECTED: 'error' as const,
    };
    statusLabel = completion.status;
    statusType = typeMap[completion.status as 'APPROVED' | 'SUBMITTED' | 'REJECTED'] || 'info';
  } else if (isOverdue) {
    statusLabel = 'OVERDUE';
    statusType = 'error';
  }

  return (
    <AppShell role="MEMBER" user={userProp}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/member/tasks"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Tasks
        </Link>

        {/* Header Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/30 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Task Assignment
              </span>
              <StatusBadge label={statusLabel} type={statusType} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {task.title}
            </h1>
          </div>
        </div>

        {/* Task Details Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900/30 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Description
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {task.description || 'No description provided for this task.'}
              </p>
            </div>

            {/* Completion Form or Completion Info */}
            {completion ? (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/50 p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Submission Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800/70 dark:text-emerald-400/70 block">
                      Submitted On
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {new Date(completion.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-800/70 dark:text-emerald-400/70 block">
                      Submission Notes
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-950">
                      {completion.notes || 'No notes submitted.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <CompletionForm taskId={taskId} />
            )}
          </div>

          {/* Sidebar metadata */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900/30 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Assignment Meta
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Club Name</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {task.clubName}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Assigned Date</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {new Date(assignedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Due Date</span>
                    <span className={`text-sm font-medium ${isOverdue && !completion ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
