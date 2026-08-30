'use client';

import { useState, useTransition } from 'react';
import { TransferRequest } from '@/lib/database/club-transfers';
import { reviewTransferAction } from '@/features/club-transfer/actions';
import {
  ArrowLeftRight,
  ArrowRight,
  User,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface ClubTransfersClientProps {
  pendingRequests: TransferRequest[];
}

export function ClubTransfersClient({ pendingRequests }: ClubTransfersClientProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Confirm state
  const [activeDecision, setActiveDecision] = useState<{
    request: TransferRequest;
    type: 'APPROVE' | 'REJECT';
  } | null>(null);

  const [comments, setComments] = useState('');

  const handleOpenDecision = (request: TransferRequest, type: 'APPROVE' | 'REJECT') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveDecision({ request, type });
    setComments('');
  };

  const handleCloseDecision = () => {
    setActiveDecision(null);
    setComments('');
  };

  const handleConfirmDecision = () => {
    if (!activeDecision) return;

    startTransition(async () => {
      setErrorMsg(null);
      
      const res = await reviewTransferAction(null, {
        requestId: activeDecision.request.id,
        action: activeDecision.type,
        comments: activeDecision.type === 'REJECT' ? comments : undefined,
      });

      if (res.success) {
        setSuccessMsg(
          `Request has been successfully ${
            activeDecision.type === 'APPROVE' ? 'approved' : 'rejected'
          }.`
        );
        handleCloseDecision();
      } else {
        setErrorMsg(res.error || 'Failed to process decision.');
      }
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto relative">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-indigo-500" />
          Review Club Transfer Requests
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
          Review and approve or reject pending member requests to transfer between club departments.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-2.5 shadow-sm animate-in slide-in-from-top-2">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 text-sm flex items-start gap-2.5 shadow-sm animate-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Review Queue */}
      <div className="space-y-6">
        {pendingRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 p-12 text-center text-slate-500 dark:text-slate-450">
            <CheckCircle className="h-10 w-10 text-slate-355 mx-auto mb-3" />
            <h4 className="font-semibold text-slate-700 dark:text-slate-300">Queue is Clear</h4>
            <p className="text-xs text-slate-400 mt-1">No pending club transfer requests are awaiting review.</p>
          </div>
        ) : (
          pendingRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6 hover:shadow-md transition duration-200"
            >
              {/* Request Info */}
              <div className="space-y-4 flex-1">
                {/* Header info */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-550/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-850 dark:text-slate-100 text-base">
                      {req.userName}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{req.userEmail}</p>
                  </div>
                </div>

                {/* Transfer Direction */}
                <div className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 w-fit text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>{req.currentClubName}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-indigo-600 dark:text-indigo-400">{req.newClubName}</span>
                </div>

                {/* Reason quotation */}
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Reason for Transfer
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">
                    &ldquo;{req.reason}&rdquo;
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Requested on {new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 md:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenDecision(req, 'REJECT')}
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 transition focus:outline-none"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDecision(req, 'APPROVE')}
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition focus:outline-none"
                >
                  Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      {activeDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  activeDecision.type === 'APPROVE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                {activeDecision.type === 'APPROVE' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Transfer {activeDecision.type === 'APPROVE' ? 'Approval' : 'Rejection'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirming action for member **{activeDecision.request.userName}**.
                </p>
              </div>
            </div>

            {/* Transfer Detail Summary */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-400">Current Club:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {activeDecision.request.currentClubName}
                </span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-400">Target Club:</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {activeDecision.request.newClubName}
                </span>
              </div>
            </div>

            {/* Rejection comments input */}
            {activeDecision.type === 'REJECT' && (
              <div className="space-y-2">
                <label
                  htmlFor="rejectionComments"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-350"
                >
                  Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="rejectionComments"
                  required
                  rows={3}
                  minLength={5}
                  maxLength={500}
                  placeholder="Please state the reason for rejecting this request. (Min 5 chars)"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            )}

            {/* Confirmation actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseDecision}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={
                  isPending || (activeDecision.type === 'REJECT' && comments.trim().length < 5)
                }
                className={`px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition ${
                  activeDecision.type === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-650/50'
                    : 'bg-rose-600 hover:bg-rose-500 disabled:bg-rose-650/50'
                }`}
              >
                {isPending ? 'Processing...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
