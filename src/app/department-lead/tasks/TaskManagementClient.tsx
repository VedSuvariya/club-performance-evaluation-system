'use client';

import { useState, useTransition } from 'react';
import {
  createTaskAction,
  assignTaskAction,
} from '@/features/task-management/department-lead-actions';
import { ClubTaskDetails, ClubMemberStats } from '@/lib/database/department-lead';
import {
  Plus,
  Users,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/dashboard/components';

interface TaskManagementClientProps {
  initialTasks: ClubTaskDetails[];
  members: ClubMemberStats[];
}

export function TaskManagementClient({
  initialTasks,
  members,
}: TaskManagementClientProps) {
  const tasks = initialTasks;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ClubTaskDetails | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('dueDate', dueDate);

    startTransition(async () => {
      const result = await createTaskAction(null, formData);
      if (result.success) {
        setSuccessMsg('Task created successfully.');
        setTitle('');
        setDescription('');
        setDueDate('');
        // Close modal after brief timeout to show success
        setTimeout(() => {
          setIsCreateOpen(false);
          setSuccessMsg(null);
          window.location.reload();
        }, 1500);
      } else {
        setError(result.error || 'Failed to create task.');
      }
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await assignTaskAction(null, {
        taskId: selectedTask.id,
        memberIds: selectedMemberIds,
      });

      if (result.success) {
        setSuccessMsg('Task assigned successfully.');
        setSelectedMemberIds([]);
        setTimeout(() => {
          setIsAssignOpen(false);
          setSelectedTask(null);
          setSuccessMsg(null);
          window.location.reload();
        }, 1500);
      } else {
        setError(result.error || 'Failed to assign task.');
      }
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: 'Task Info',
      accessor: (row: ClubTaskDetails) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-white block">
            {row.title}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block max-w-sm truncate mt-0.5">
            {row.description}
          </span>
        </div>
      ),
    },
    {
      header: 'Created On',
      accessor: (row: ClubTaskDetails) => (
        <span className="text-sm text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Due Date',
      accessor: (row: ClubTaskDetails) => (
        <span className="text-sm text-slate-500">
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'No Due Date'}
        </span>
      ),
    },
    {
      header: 'Assignments',
      accessor: (row: ClubTaskDetails) => (
        <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
          <Users className="h-4 w-4 text-slate-400" />
          {row.assignedCount} assigned
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: ClubTaskDetails) => {
        const typeMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
          OPEN: 'info',
          IN_PROGRESS: 'warning',
          COMPLETED: 'success',
          CANCELLED: 'error',
        };
        return <StatusBadge label={row.status} type={typeMap[row.status] || 'neutral'} />;
      },
    },
    {
      header: 'Action',
      accessor: (row: ClubTaskDetails) => (
        <button
          onClick={() => {
            setSelectedTask(row);
            setSelectedMemberIds([]);
            setIsAssignOpen(true);
          }}
          type="button"
          className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition focus:outline-none"
        >
          Assign Task
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header section with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Tasks & Assignments
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Publish tasks, monitor progress, and delegate responsibilities.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setSuccessMsg(null);
            setIsCreateOpen(true);
          }}
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              type="button"
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <DataTable
        columns={columns}
        data={filteredTasks}
        emptyText="No tasks match the filter criteria."
      />

      {/* CREATE TASK MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Create New Task
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Publish a new task outline for the department. This will be assignable to members immediately.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Prepare Design System Banner"
                  className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide outline and key deliverables..."
                  className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-rose-600 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 p-3 rounded-lg text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-lg text-sm">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none transition disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TASK MODAL */}
      {isAssignOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAssignOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Assign Task: {selectedTask.title}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Select one or more active members of your department to assign this task.
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2.5">
                {members.length === 0 ? (
                  <span className="text-xs text-slate-500 block text-center py-6">
                    No active members in your club to assign.
                  </span>
                ) : (
                  members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMemberIds([...selectedMemberIds, member.id]);
                          } else {
                            setSelectedMemberIds(
                              selectedMemberIds.filter((id) => id !== member.id)
                            );
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                          {member.fullName}
                        </span>
                        <span className="text-xs text-slate-500">{member.email}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-rose-600 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 p-3 rounded-lg text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-lg text-sm">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || selectedMemberIds.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none transition disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Confirm Assignments'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
