'use client';

import { useState, useTransition } from 'react';
import { submitEvaluationAction } from '@/features/evaluation/actions';
import {
  FileText,
  User,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

interface EvaluationDetailClientProps {
  detail: {
    task: {
      id: string;
      title: string;
      description: string;
      dueDate: string | null;
      createdAt: string;
    };
    member: {
      id: string;
      fullName: string;
      email: string;
      joinedAt: string;
    };
    completion: {
      status: string;
      notes: string;
      submittedAt: string;
    };
    evaluation: {
      id: string;
      rating: number;
      feedback: string;
      createdAt: string;
      evaluatorName: string;
    } | null;
  };
}

const RATING_DESCRIPTIONS = [
  'Needs Significant Improvement',
  'Needs Improvement',
  'Meets Expectations',
  'Very Good',
  'Excellent',
];

export function EvaluationDetailClient({ detail }: EvaluationDetailClientProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === null) return;
    setError(null);
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (rating === null) return;
    setIsConfirmOpen(false);

    startTransition(async () => {
      const result = await submitEvaluationAction(null, {
        taskId: detail.task.id,
        memberId: detail.member.id,
        rating,
        feedback,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to submit evaluation.');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Back button */}
      <div>
        <Link
          href="/department-lead/evaluations"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Review Queue
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: metadata cards */}
        <div className="md:col-span-1 space-y-6">
          {/* Member card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <User className="h-4 w-4 text-indigo-500" />
              Member Information
            </h4>
            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block text-base">
                {detail.member.fullName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                {detail.member.email}
              </span>
              <span className="text-xs text-slate-400 block mt-2">
                Joined: {new Date(detail.member.joinedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Task metadata */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-indigo-500" />
              Task Details
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-350 block">
                  {detail.task.title}
                </span>
                <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                  {detail.task.description}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Assigned:</span>
                  <span>{new Date(detail.task.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span>
                    {detail.task.dueDate
                      ? new Date(detail.task.dueDate).toLocaleDateString()
                      : 'No Limit'}
                  </span>
                </div>
                <div className="flex justify-between font-medium text-emerald-600">
                  <span>Completed:</span>
                  <span>{new Date(detail.completion.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: submission and form */}
        <div className="md:col-span-2 space-y-6">
          {/* Member's work notes */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Member Completion Notes
            </h4>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {detail.completion.notes || (
                <em className="text-slate-400">No completion description provided.</em>
              )}
            </div>
          </div>

          {/* Evaluation card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
            {detail.evaluation ? (
              // Case A: Already evaluated
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-850 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Evaluation Result
                    </h3>
                    <p className="text-xs text-slate-400">
                      Evaluated by {detail.evaluation.evaluatorName} on{' '}
                      {new Date(detail.evaluation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 px-3.5 py-1.5 rounded-full font-bold text-sm border border-indigo-150 dark:border-indigo-900/50">
                    ★ {detail.evaluation.rating} / 5
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Feedback Comment
                  </span>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {detail.evaluation.feedback || (
                      <em className="text-slate-400">No feedback comment submitted.</em>
                    )}
                  </div>
                </div>
              </div>
            ) : success ? (
              // Case B: Just submitted successfully
              <div className="text-center py-8 space-y-4">
                <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <CheckCircle className="h-10 w-10 animate-bounce" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Evaluation Submitted Successfully
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  The rating score and review feedback have been safely saved. Redirecting back to review queue...
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => window.location.reload()}
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Refresh page
                  </button>
                </div>
              </div>
            ) : (
              // Case C: Evaluation Form
              <form onSubmit={handleOpenConfirm} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Submit Performance Rating
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assess the member&apos;s work and output quality below. Once saved, evaluations are permanent.
                  </p>
                </div>

                {/* Rating selection (1-5 radio grid) */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Task Rating Score
                  </label>
                  <div className="grid gap-2.5 sm:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <label
                        key={val}
                        className={`flex flex-col items-center p-3 rounded-lg border text-center cursor-pointer transition focus-within:ring-2 focus-within:ring-indigo-500/20 ${
                          rating === val
                            ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rating"
                          required
                          value={val}
                          checked={rating === val}
                          onChange={() => setRating(val)}
                          className="sr-only"
                        />
                        <span className="text-base font-bold mb-0.5">★ {val}</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">
                          {RATING_DESCRIPTIONS[val - 1]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Feedback Comment */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Feedback Comment (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide constructive feedback, suggestions for growth, or commendations..."
                    className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-rose-600 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 p-3 rounded-lg text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={rating === null || isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none transition disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Evaluation'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-500" />
              Submit Evaluation?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to finalize this rating? Once submitted, this evaluation cannot be changed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                type="button"
                className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-white px-4 py-2.5 text-sm font-semibold transition focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                type="button"
                className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-sm font-semibold transition focus:outline-none shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
