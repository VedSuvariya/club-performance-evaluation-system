import Link from 'next/link';
import { getReportById, getClubSummaryStats } from '@/lib/database/reports';
import { getMemberPerformanceSummary, EvaluationRecord } from '@/lib/database/performance';
import { getMemberTransferHistory, getCurrentMembership, TransferRequest } from '@/lib/database/club-transfers';
import { createSupabaseServerClient } from '@/lib/database/server';
import { StatCard, DataTable } from '@/components/dashboard/components';
import { ArrowLeft, Download, Award, Clock, FileText, CheckCircle, HelpCircle } from 'lucide-react';
import { notFound } from 'next/navigation';

interface ReportPreviewProps {
  reportId: string;
  basePath: 'member' | 'department-lead' | 'club-president' | 'swc';
}

export async function ReportPreview({ reportId, basePath }: ReportPreviewProps) {
  const report = await getReportById(reportId);
  if (!report || report.status?.toUpperCase() !== 'COMPLETED') {
    notFound();
  }

  interface ClubMemberRow {
    id: string;
    fullName: string;
    email: string;
    assignedCount: number;
    completedCount: number;
    completionRate: number;
    averageRating: number;
  }

  interface ClubEvaluationRow {
    id: string;
    taskTitle: string;
    memberName: string;
    rating: number;
    feedback: string;
    createdAt: string;
  }

  // Member details variables
  let memberProfile = { fullName: '', email: '', clubName: '', joinedAt: '' };
  let memberMetrics = { totalAssigned: 0, totalCompleted: 0, completionRate: 0, averageRating: 0 };
  let memberRecentEvaluations: EvaluationRecord[] = [];
  let memberTransfers: TransferRequest[] = [];

  // Club details variables
  let clubName = '';
  let clubDescription = '';
  let clubMemberCount = 0;
  let clubTotalAssigned = 0;
  let clubTotalCompleted = 0;
  let clubCompletionRate = 0;
  let clubEvaluatedMembersCount = 0;
  let clubAverageRating = 0;
  let clubMembersList: ClubMemberRow[] = [];
  let clubRecentEvaluations: ClubEvaluationRow[] = [];

  if (report.reportType === 'MEMBER_EVALUATION') {
    if (!report.targetUserId) notFound();

    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', report.targetUserId)
      .single();

    if (!profile) notFound();

    const activeMem = await getCurrentMembership(report.targetUserId);
    const perfSummary = await getMemberPerformanceSummary(report.targetUserId);
    const transfers = await getMemberTransferHistory(report.targetUserId);

    memberProfile = {
      fullName: profile.full_name || 'Unknown',
      email: profile.email || '',
      clubName: activeMem?.clubName || 'None',
      joinedAt: activeMem?.joinedAt || new Date().toISOString(),
    };
    memberMetrics = {
      totalAssigned: perfSummary.totalAssigned,
      totalCompleted: perfSummary.totalCompleted,
      completionRate: perfSummary.completionRate,
      averageRating: perfSummary.averageRating,
    };
    memberRecentEvaluations = perfSummary.recentEvaluations;
    memberTransfers = transfers;
  } else {
    if (!report.targetClubId) notFound();
    const clubStats = await getClubSummaryStats(report.targetClubId);
    if (!clubStats) notFound();

    clubName = clubStats.clubName;
    clubDescription = clubStats.description;
    clubMemberCount = clubStats.memberCount;
    clubTotalAssigned = clubStats.totalAssigned;
    clubTotalCompleted = clubStats.totalCompleted;
    clubCompletionRate = clubStats.completionRate;
    clubEvaluatedMembersCount = clubStats.evaluatedMembersCount;
    clubAverageRating = clubStats.averageRating;
    clubMembersList = clubStats.membersList;
    clubRecentEvaluations = clubStats.recentEvaluations;
  }

  const isMemberType = report.reportType === 'MEMBER_EVALUATION';

  return (
    <div className="space-y-6">
      {/* Header / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href={`/${basePath}/reports`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Report History
        </Link>
        <a
          href={`/api/reports/${report.id}/download`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF Report
        </a>
      </div>

      {/* Main Preview Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-8 shadow-md max-w-4xl mx-auto space-y-8">
        
        {/* Decorative Top Accent */}
        <div className="h-3 bg-indigo-950 dark:bg-indigo-900 rounded-t-lg -mx-8 -mt-8" />

        {/* Title Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100 dark:divide-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {isMemberType ? 'Member Performance Report' : 'Club Summary Report'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Generated on {new Date(report.createdAt).toLocaleString()} by {report.generator?.fullName || 'System'}
            </p>
          </div>
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
            STATUS: COMPLETED
          </div>
        </div>

        {/* Profile Card Summary */}
        <div className="grid gap-6 md:grid-cols-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 p-5 border border-slate-200/50 dark:border-slate-800/50">
          <div>
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
              {isMemberType ? 'Member Profile Details' : 'Club Details'}
            </h3>
            {isMemberType ? (
              <dl className="grid grid-cols-3 gap-y-2 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Name:</dt>
                <dd className="col-span-2 font-medium text-slate-900 dark:text-white">{memberProfile.fullName}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Email:</dt>
                <dd className="col-span-2 font-medium text-slate-900 dark:text-white">{memberProfile.email}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Club:</dt>
                <dd className="col-span-2 font-medium text-slate-900 dark:text-white">{memberProfile.clubName}</dd>
              </dl>
            ) : (
              <dl className="grid grid-cols-3 gap-y-2 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Club Name:</dt>
                <dd className="col-span-2 font-medium text-slate-900 dark:text-white">{clubName}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Description:</dt>
                <dd className="col-span-2 text-slate-700 dark:text-slate-300">{clubDescription || 'No description provided.'}</dd>
              </dl>
            )}
          </div>
          <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
              Report Metadata
            </h3>
            <dl className="grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Report ID:</dt>
              <dd className="col-span-2 font-mono text-xs text-slate-600 dark:text-slate-400 truncate">{report.id}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Creator:</dt>
              <dd className="col-span-2 font-medium text-slate-900 dark:text-white">{report.generator?.fullName} ({report.generator?.role})</dd>
              <dt className="text-slate-500 dark:text-slate-400">Mime Type:</dt>
              <dd className="col-span-2 font-medium text-slate-900 dark:text-white">application/pdf</dd>
            </dl>
          </div>
        </div>

        {/* Performance Statistics Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Performance Statistics Summary
          </h2>
          {isMemberType ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <StatCard title="Assigned Tasks" value={memberMetrics.totalAssigned} icon={Clock} />
              <StatCard title="Completed Tasks" value={memberMetrics.totalCompleted} icon={CheckCircle} />
              <StatCard title="Completion Rate" value={`${memberMetrics.completionRate}%`} icon={FileText} />
              <StatCard title="Average Rating" value={memberMetrics.averageRating > 0 ? `${memberMetrics.averageRating}/5` : 'N/A'} icon={Award} />
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
              <StatCard title="Members" value={clubMemberCount} icon={HelpCircle} />
              <StatCard title="Assigned" value={clubTotalAssigned} icon={Clock} />
              <StatCard title="Completed" value={clubTotalCompleted} icon={CheckCircle} />
              <StatCard title="Rate" value={`${clubCompletionRate}%`} icon={FileText} />
              <StatCard title="Rated" value={clubEvaluatedMembersCount} icon={HelpCircle} />
              <StatCard title="Avg Rating" value={clubAverageRating > 0 ? `${clubAverageRating}/5` : 'N/A'} icon={Award} />
            </div>
          )}
        </div>

        {/* Custom Data Tables (Member Evaluations, Club Memberships) */}
        {isMemberType ? (
          <div className="space-y-6">
            {/* Recent Evaluations Table */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Evaluations Log
              </h2>
              <DataTable
                columns={[
                  { header: 'Date', accessor: (row: EvaluationRecord) => new Date(row.createdAt).toLocaleDateString() },
                  { header: 'Task Title', accessor: (row: EvaluationRecord) => row.taskTitle },
                  { header: 'Evaluator', accessor: (row: EvaluationRecord) => row.evaluatorName },
                  { header: 'Rating', accessor: (row: EvaluationRecord) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{row.rating}/5</span> },
                  { header: 'Feedback', accessor: (row: EvaluationRecord) => row.feedback || <span className="text-slate-400 italic">None</span> },
                ]}
                data={memberRecentEvaluations}
                emptyText="No task evaluations completed."
              />
            </div>

            {/* Club Transfer History Table */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Club Transfer History
              </h2>
              <DataTable
                columns={[
                  { header: 'Decision Date', accessor: (row: TransferRequest) => row.decidedAt ? new Date(row.decidedAt).toLocaleDateString() : 'N/A' },
                  { header: 'Current Club', accessor: (row: TransferRequest) => row.currentClubName },
                  { header: 'Target Club', accessor: (row: TransferRequest) => row.newClubName },
                  { header: 'Status', accessor: (row: TransferRequest) => row.status },
                  { header: 'Reason', accessor: (row: TransferRequest) => row.reason },
                ]}
                data={memberTransfers}
                emptyText="No club transfer logs recorded."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Club Members Performance Table */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Club Members Performance
              </h2>
              <DataTable
                columns={[
                  { header: 'Member Name', accessor: (row: ClubMemberRow) => row.fullName },
                  { header: 'Email Address', accessor: (row: ClubMemberRow) => row.email },
                  { header: 'Assigned', accessor: (row: ClubMemberRow) => row.assignedCount },
                  { header: 'Completed', accessor: (row: ClubMemberRow) => row.completedCount },
                  { header: 'Completion Rate', accessor: (row: ClubMemberRow) => `${row.completionRate}%` },
                  { header: 'Avg Rating', accessor: (row: ClubMemberRow) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{row.averageRating > 0 ? `${row.averageRating}/5` : 'N/A'}</span> },
                ]}
                data={clubMembersList}
                emptyText="No members found in this club."
              />
            </div>

            {/* Recent Evaluations Log Table */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Evaluations Log
              </h2>
              <DataTable
                columns={[
                  { header: 'Date', accessor: (row: ClubEvaluationRow) => new Date(row.createdAt).toLocaleDateString() },
                  { header: 'Member Name', accessor: (row: ClubEvaluationRow) => row.memberName },
                  { header: 'Task Title', accessor: (row: ClubEvaluationRow) => row.taskTitle },
                  { header: 'Rating', accessor: (row: ClubEvaluationRow) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{row.rating}/5</span> },
                  { header: 'Feedback', accessor: (row: ClubEvaluationRow) => row.feedback || <span className="text-slate-400 italic">None</span> },
                ]}
                data={clubRecentEvaluations}
                emptyText="No evaluations logged in this club."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
