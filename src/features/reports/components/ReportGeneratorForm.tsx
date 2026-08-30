'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateReportAction } from '../actions';
import { FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface ClubInfo {
  id: string;
  name: string;
}

interface MemberInfo {
  id: string;
  fullName: string;
  email: string;
  clubId: string;
}

interface ReportGeneratorFormProps {
  userRole:
  | 'MEMBER'
  | 'DEPARTMENT_LEAD'
  | 'CLUB_PRESIDENT'
  | 'STUDENT_WELFARE_COUNCIL';
  currentUserId: string;
  clubs?: ClubInfo[];
  members?: MemberInfo[];
  leadClubId?: string | null;
}

export function ReportGeneratorForm({
  userRole,
  currentUserId,
  clubs = [],
  members = [],
  leadClubId = null,
}: ReportGeneratorFormProps) {
  const router = useRouter();

  const [reportType, setReportType] = useState<
    'MEMBER_EVALUATION' | 'CLUB_SUMMARY'
  >(userRole === 'MEMBER' ? 'MEMBER_EVALUATION' : 'CLUB_SUMMARY');

  const [selectedClubId, setSelectedClubId] = useState<string>(
    userRole === 'STUDENT_WELFARE_COUNCIL'
      ? clubs[0]?.id || ''
      : leadClubId || ''
  );

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter members based on selected club
  const filteredMembers = members.filter(
    (m) => m.clubId === selectedClubId
  );

  // Resolve the active target user ID dynamically
  const activeUserId =
    userRole === 'MEMBER'
      ? currentUserId
      : filteredMembers.some((m) => m.id === selectedUserId)
        ? selectedUserId
        : filteredMembers[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    const targetUserId =
      reportType === 'MEMBER_EVALUATION'
        ? activeUserId || null
        : null;

    const targetClubId =
      reportType === 'CLUB_SUMMARY'
        ? selectedClubId
        : null;

    if (reportType === 'MEMBER_EVALUATION' && !targetUserId) {
      setError('Please select a member.');
      setLoading(false);
      return;
    }

    if (reportType === 'CLUB_SUMMARY' && !targetClubId) {
      setError('Please select a club.');
      setLoading(false);
      return;
    }

    try {
      const res = await generateReportAction({
        reportType,
        targetUserId,
        targetClubId,
      });

      if (res.success && res.reportId) {
        setSuccess(
          'Report generated successfully! Refreshing history...'
        );

        setTimeout(() => {
          setSuccess(null);
          router.refresh();
        }, 2000);
      } else {
        setError(
          res.error || 'Failed to generate report. Please try again.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * MEMBER VIEW
   */
  if (userRole === 'MEMBER') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
            <FileText className="h-6 w-6" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Generate Your Performance Report
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Generate a snapshot report of your task completions,
              ratings, evaluations history, and transfers.
            </p>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * DEPARTMENT LEAD / CLUB PRESIDENT / SWC VIEW
   */
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-indigo-500" />
        Report Generation Tool
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Report Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Report Type
            </label>

            <select
              value={reportType}
              onChange={(e) => {
                const val = e.target.value;

                if (
                  val === 'CLUB_SUMMARY' ||
                  val === 'MEMBER_EVALUATION'
                ) {
                  setReportType(val);
                }
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="CLUB_SUMMARY">
                Club Performance Summary
              </option>

              <option value="MEMBER_EVALUATION">
                Member Performance Report
              </option>
            </select>
          </div>

          {/* Club Selector for SWC */}
          {userRole === 'STUDENT_WELFARE_COUNCIL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Target Club
              </label>

              <select
                value={selectedClubId}
                onChange={(e) => {
                  setSelectedClubId(e.target.value);
                  setSelectedUserId('');
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
              >
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Locked Club Name for Lead / President */}
          {userRole !== 'STUDENT_WELFARE_COUNCIL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Target Club
              </label>

              <input
                type="text"
                disabled
                value={
                  members.find(
                    (m) => m.clubId === selectedClubId
                  )?.clubId
                    ? `Managed Club (ID: ${selectedClubId.slice(0, 8)})`
                    : 'Your Club'
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2.5 text-sm text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed"
              />
            </div>
          )}
        </div>

        {/* Member Selector */}
        {reportType === 'MEMBER_EVALUATION' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Target Member
            </label>

            <select
              value={activeUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
            >
              {filteredMembers.length === 0 ? (
                <option value="">
                  No active members found in this club
                </option>
              ) : (
                filteredMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.email})
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Submit Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              loading ||
              (reportType === 'MEMBER_EVALUATION' && !activeUserId)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}