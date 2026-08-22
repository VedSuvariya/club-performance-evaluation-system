'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader, DataTable, StatusBadge } from '@/components/dashboard/components';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import { Search } from 'lucide-react';
import Link from 'next/link';

import { UserRole } from '@/lib/permissions';

interface TaskItem {
  assignedAt: string;
  task: {
    id: string;
    title: string;
    description: string;
    dueDate: string | null;
    status: string;
    clubName: string;
    clubId: string;
  };
  completion: {
    id: string;
    status: string;
    notes: string;
    submittedAt: string;
  } | null;
}

interface TaskListProps {
  tasks: TaskItem[];
  user: {
    fullName: string;
    email: string;
    role: UserRole;
  };
}

export function TaskList({ tasks, user }: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Filter tasks based on search and status
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        t.task.title.toLowerCase().includes(query) ||
        t.task.description.toLowerCase().includes(query) ||
        t.task.clubName.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // 2. Status Filter
      if (statusFilter === 'COMPLETED') {
        return t.completion !== null;
      }
      if (statusFilter === 'PENDING') {
        return t.completion === null;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter]);

  const columns = [
    {
      header: 'Task Title',
      accessor: (row: TaskItem) => (
        <div className="space-y-1">
          <Link
            href={`/member/tasks/${row.task.id}`}
            className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition"
          >
            {row.task.title}
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-md">
            {row.task.description}
          </p>
        </div>
      ),
    },
    {
      header: 'Club Name',
      accessor: (row: TaskItem) => (
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {row.task.clubName}
        </span>
      ),
    },
    {
      header: 'Due Date',
      accessor: (row: TaskItem) => {
        if (!row.task.dueDate) return <span className="text-xs text-slate-400">No due date</span>;
        const dateStr = new Date(row.task.dueDate).toLocaleDateString();
        const isOverdue = new Date(row.task.dueDate) < new Date() && !row.completion;
        return (
          <span className={isOverdue ? 'text-xs font-semibold text-rose-600 dark:text-rose-400' : 'text-xs text-slate-500'}>
            {dateStr}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row: TaskItem) => {
        if (row.completion) {
          const typeMap = {
            APPROVED: 'success' as const,
            SUBMITTED: 'info' as const,
            REJECTED: 'error' as const,
          };
          const status = row.completion.status as 'APPROVED' | 'SUBMITTED' | 'REJECTED';
          return <StatusBadge label={status} type={typeMap[status] || 'info'} />;
        }

        const isOverdue = row.task.dueDate ? new Date(row.task.dueDate) < new Date() : false;
        return (
          <StatusBadge
            label={isOverdue ? 'OVERDUE' : 'PENDING'}
            type={isOverdue ? 'error' : 'warning'}
          />
        );
      },
    },
    {
      header: 'Completed Date',
      accessor: (row: TaskItem) => {
        if (!row.completion) return <span className="text-xs text-slate-400">-</span>;
        return (
          <span className="text-xs text-slate-500">
            {new Date(row.completion.submittedAt).toLocaleDateString()}
          </span>
        );
      },
    },
  ];

  return (
    <AppShell role="MEMBER" user={user}>
      <div className="space-y-8">
        <SectionHeader
          title="My Tasks"
          description="View and manage all task assignments received from your department leads."
        />

        {/* Filter Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                statusFilter === 'PENDING'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                statusFilter === 'COMPLETED'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-sm w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search tasks, clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition"
            />
          </div>
        </div>

        {/* Tasks Table/Empty State */}
        {filteredTasks.length > 0 ? (
          <div className="animate-in fade-in duration-300">
            <DataTable columns={columns} data={filteredTasks} emptyText="No matching tasks found." />
          </div>
        ) : (
          <EmptyState
            title={searchQuery ? 'No results found' : 'No tasks assigned'}
            description={
              searchQuery
                ? 'Try adjusting your search terms or changing your filters.'
                : 'You currently have no tasks in this category.'
            }
            actionLabel={searchQuery ? 'Clear Filters' : undefined}
            onAction={
              searchQuery
                ? () => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }
                : undefined
            }
          />
        )}
      </div>
    </AppShell>
  );
}
