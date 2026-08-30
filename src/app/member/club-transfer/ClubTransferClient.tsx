'use client';

import { useActionState, useEffect, useRef } from 'react';
import { requestTransferAction } from '@/features/club-transfer/actions';
import { ClubMembership, ClubInfo, TransferRequest } from '@/lib/database/club-transfers';
import {
  ArrowLeftRight,
  ArrowRight,
  Building,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/components';

interface ClubTransferClientProps {
  currentMembership: ClubMembership | null;
  availableClubs: ClubInfo[];
  transferHistory: TransferRequest[];
}

export function ClubTransferClient({
  currentMembership,
  availableClubs,
  transferHistory,
}: ClubTransferClientProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(requestTransferAction, null);

  const hasPending = transferHistory.some((t) => t.status === 'PENDING');

  // Reset form upon successful submission
  useEffect(() => {
    if (state?.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin-slow" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-indigo-500" />
          Club Transfer Management
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Apply to transfer to another club or review your transfer request history.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Current Club and Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Current Active Membership */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Building className="h-4 w-4 text-indigo-500" />
              Current Active Club
            </h3>

            {currentMembership ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                    {currentMembership.clubName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined on {new Date(currentMembership.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge label="ACTIVE" type="success" />
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-4 rounded-lg bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm">You do not currently have any active club membership.</p>
              </div>
            )}
          </div>

          {/* Card 2: Request Transfer Form */}
          {currentMembership && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-500" />
                Request Club Transfer
              </h3>

              {hasPending ? (
                <div className="p-4 rounded-lg bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 shrink-0 text-amber-500 animate-pulse" />
                    <h5 className="font-semibold text-sm">Transfer Request Under Review</h5>
                  </div>
                  <p className="text-xs leading-normal">
                    You already have a pending transfer request. You cannot submit another transfer request
                    until the Club President reviews or rejects your current one.
                  </p>
                </div>
              ) : availableClubs.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500 text-center text-sm">
                  No other active clubs are currently available to transfer to.
                </div>
              ) : (
                <form ref={formRef} action={formAction} className="space-y-5">
                  {state?.error && (
                    <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{state.error}</span>
                    </div>
                  )}

                  {state?.success && (
                    <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Transfer request submitted successfully.</span>
                    </div>
                  )}

                  {/* Target Club Selection */}
                  <div className="space-y-2">
                    <label
                      htmlFor="targetClubId"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Target Club
                    </label>
                    <select
                      id="targetClubId"
                      name="targetClubId"
                      required
                      defaultValue=""
                      className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="" disabled>
                        Select target club...
                      </option>
                      {availableClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transfer Reason */}
                  <div className="space-y-2">
                    <label
                      htmlFor="reason"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Transfer Reason
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      required
                      rows={4}
                      minLength={10}
                      maxLength={500}
                      placeholder="Please provide a detailed reason for requesting a transfer. (Min 10 chars, Max 500)"
                      className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Submitting request...
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Request History */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm h-fit">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-500" />
            Transfer History
          </h3>

          {transferHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-450 dark:text-slate-500 text-sm">
              No previous transfer requests.
            </div>
          ) : (
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
              {transferHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 border border-slate-150 dark:border-slate-800/80 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-350">
                      <span>{item.currentClubName}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {item.newClubName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {getStatusIcon(item.status)}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'APPROVED'
                            ? 'text-emerald-600 dark:text-emerald-450'
                            : item.status === 'REJECTED'
                            ? 'text-rose-600 dark:text-rose-450'
                            : item.status === 'PENDING'
                            ? 'text-amber-600 dark:text-amber-450'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Reason: </span>
                      {item.reason}
                    </p>

                    {item.comments && (
                      <div className="mt-2 p-2 rounded bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-950/30 flex gap-1.5 items-start text-[11px] text-rose-800 dark:text-rose-350">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-500" />
                        <p>
                          <span className="font-semibold">Review Comment:</span> {item.comments}
                        </p>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                      Submitted on {new Date(item.createdAt).toLocaleDateString()}
                      {item.decidedAt && ` • Decided on ${new Date(item.decidedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
