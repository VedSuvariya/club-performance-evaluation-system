'use client';

import { useState } from 'react';
import { ClubCompletionDetails } from '@/lib/database/department-lead';
import { ClubEvaluationDetails } from '@/lib/database/evaluations';
import { StatusBadge, DataTable } from '@/components/dashboard/components';
import Link from 'next/link';

interface EvaluationsClientProps {
  completions: ClubCompletionDetails[];
  evaluated: ClubEvaluationDetails[];
}

export function EvaluationsClient({ completions, evaluated }: EvaluationsClientProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'evaluated'>('pending');

  const pendingColumns = [
    {
      header: 'Member',
      accessor: (row: ClubCompletionDetails) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-white block">
            {row.memberName}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">{row.memberEmail}</span>
        </div>
      ),
    },
    {
      header: 'Task Title',
      accessor: (row: ClubCompletionDetails) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{row.taskTitle}</span>
      ),
    },
    {
      header: 'Submitted',
      accessor: (row: ClubCompletionDetails) => (
        <span className="text-xs text-slate-500">
          {new Date(row.submittedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: () => (
        <StatusBadge label="PENDING EVALUATION" type="warning" />
      ),
    },
    {
      header: 'Action',
      accessor: (row: ClubCompletionDetails) => (
        <Link
          href={`/department-lead/evaluations/${row.taskId}?memberId=${row.memberId}`}
          className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition focus:outline-none"
        >
          Evaluate Work
        </Link>
      ),
    },
  ];

  const evaluatedColumns = [
    {
      header: 'Member',
      accessor: (row: ClubEvaluationDetails) => (
        <span className="font-semibold text-slate-900 dark:text-white block">
          {row.memberName}
        </span>
      ),
    },
    {
      header: 'Task Title',
      accessor: (row: ClubEvaluationDetails) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-350">{row.taskTitle}</span>
      ),
    },
    {
      header: 'Evaluated On',
      accessor: (row: ClubEvaluationDetails) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Rating',
      accessor: (row: ClubEvaluationDetails) => {
        const ratingLabel = ['Improvement', 'Needs Work', 'Meets Exp', 'Very Good', 'Excellent'][row.rating - 1];
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              ★ {row.rating} / 5
            </span>
            <span className="text-xs text-slate-500">{ratingLabel}</span>
          </div>
        );
      },
    },
    {
      header: 'Action',
      accessor: (row: ClubEvaluationDetails) => (
        <Link
          href={`/department-lead/evaluations/${row.taskId}?memberId=${row.memberId}`}
          className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition focus:outline-none"
        >
          View Details
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          Completed Work Review & Evaluation
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review tasks submitted by members, assign performance rating scores, and submit feedback.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-850">
        <button
          onClick={() => setActiveTab('pending')}
          type="button"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px focus:outline-none ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Awaiting Evaluation ({completions.length})
        </button>
        <button
          onClick={() => setActiveTab('evaluated')}
          type="button"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px focus:outline-none ${
            activeTab === 'evaluated'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Evaluated ({evaluated.length})
        </button>
      </div>

      {activeTab === 'pending' ? (
        <DataTable
          columns={pendingColumns}
          data={completions}
          emptyText="No task completions are currently awaiting evaluation."
        />
      ) : (
        <DataTable
          columns={evaluatedColumns}
          data={evaluated}
          emptyText="No tasks have been evaluated yet."
        />
      )}
    </div>
  );
}
