'use client';

import { useState } from 'react';
import { MemberEvaluationDetails } from '@/lib/database/evaluations';
import { DataTable } from '@/components/dashboard/components';
import { FileText, User, Calendar, X, Award } from 'lucide-react';

interface MemberEvaluationsClientProps {
  evaluations: MemberEvaluationDetails[];
}

export function MemberEvaluationsClient({ evaluations }: MemberEvaluationsClientProps) {
  const [selectedEval, setSelectedEval] = useState<MemberEvaluationDetails | null>(null);

  const columns = [
    {
      header: 'Task Title',
      accessor: (row: MemberEvaluationDetails) => (
        <span className="font-semibold text-slate-900 dark:text-white block">
          {row.taskTitle}
        </span>
      ),
    },
    {
      header: 'Submitted On',
      accessor: (row: MemberEvaluationDetails) => (
        <span className="text-xs text-slate-500">
          {new Date(row.completionDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Evaluator',
      accessor: (row: MemberEvaluationDetails) => (
        <span className="text-sm text-slate-600 dark:text-slate-400 block">
          {row.evaluatorName}
        </span>
      ),
    },
    {
      header: 'Evaluation Date',
      accessor: (row: MemberEvaluationDetails) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Rating Score',
      accessor: (row: MemberEvaluationDetails) => {
        const ratingLabel = ['Improvement', 'Needs Work', 'Meets Exp', 'Very Good', 'Excellent'][row.rating - 1];
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-350">
              ★ {row.rating} / 5
            </span>
            <span className="text-xs text-slate-500">{ratingLabel}</span>
          </div>
        );
      },
    },
    {
      header: 'Action',
      accessor: (row: MemberEvaluationDetails) => (
        <button
          onClick={() => setSelectedEval(row)}
          type="button"
          className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition focus:outline-none"
        >
          View Feedback
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          My Performance Evaluations
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          View ratings and qualitative feedback submitted by your Department Lead for completed tasks.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={evaluations}
        emptyText="You do not have any evaluated tasks yet."
      />

      {/* FEEDBACK DETAILS MODAL */}
      {selectedEval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedEval(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Evaluation Feedback Details
            </h3>

            {/* Score box */}
            <div className="flex items-center justify-between bg-indigo-50/55 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold block uppercase tracking-wider">
                    Rating Assigned
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {['Needs Significant Improvement', 'Needs Improvement', 'Meets Expectations', 'Very Good', 'Excellent'][selectedEval.rating - 1]}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                ★ {selectedEval.rating} / 5
              </div>
            </div>

            {/* Task details */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-100 dark:border-slate-800/80 mb-6 text-sm">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold">{selectedEval.taskTitle}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <User className="h-4 w-4 text-slate-400" />
                <span>Evaluator: <strong>{selectedEval.evaluatorName}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Evaluated on: {new Date(selectedEval.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Feedback Content */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Evaluator Feedback Comments
              </label>
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {selectedEval.feedback || <em className="text-slate-400">No commentary feedback was provided.</em>}
              </div>
            </div>

            <button
              onClick={() => setSelectedEval(null)}
              type="button"
              className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-white px-4 py-2.5 text-sm font-semibold transition focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
