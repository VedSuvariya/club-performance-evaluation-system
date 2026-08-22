'use client';

import { useState, useTransition } from 'react';
import { completeTaskAction } from '@/features/task-management/actions';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface CompletionFormProps {
  taskId: string;
}

export function CompletionForm({ taskId }: CompletionFormProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Create form data payload
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('notes', notes);

    startTransition(async () => {
      try {
        const result = await completeTaskAction(null, formData);
        if (result.success) {
          setSuccess(true);
        } else {
          setError(result.error || 'Failed to submit task completion.');
        }
      } catch {
        setError('An unexpected error occurred during submission.');
      }
    });
  };

  if (success) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-6 rounded-xl text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
          Task Marked as Complete
        </h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400 max-w-sm mx-auto">
          Your completion report has been successfully submitted and logged. A department lead will review the work.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/30 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
        Mark Task as Complete
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Submit completion notes. Please explain your implementation or outline details for verification.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="notes"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2"
          >
            Completion Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            placeholder="Describe what was accomplished..."
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 p-3 rounded-lg text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting Completion...
            </>
          ) : (
            'Mark as Complete'
          )}
        </button>
      </form>
    </div>
  );
}
