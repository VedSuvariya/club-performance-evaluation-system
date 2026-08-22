import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader, DataTable, StatusBadge, StatCard } from '@/components/dashboard/components';
import { getLeadClub } from '@/lib/database/department-lead';
import { getMemberClubPerformanceDetails } from '@/lib/database/performance';
import { EmptyState } from '@/components/feedback/FeedbackStates';
import Link from 'next/link';
import {
  ChevronLeft,
  Mail,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Award,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    memberId: string;
  };
}

interface MemberTaskRow {
  taskId: string;
  title: string;
  assignedAt: string;
  dueDate: string | null;
  status: string;
  notes: string;
  rating: string;
}

export default async function MemberDetailPage({ params }: PageProps) {
  const profile = await requireRole('DEPARTMENT_LEAD');
  const club = await getLeadClub(profile.id);

  const userProp = {
    fullName: profile.full_name || 'Department Lead',
    email: profile.email || '',
    role: profile.role,
  };

  if (!club) {
    return (
      <AppShell role="DEPARTMENT_LEAD" user={userProp}>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            title="No Club Assigned"
            description="You are not currently assigned to manage any club."
          />
        </div>
      </AppShell>
    );
  }

  const performance = await getMemberClubPerformanceDetails(club.id, params.memberId);

  if (!performance) {
    return (
      <AppShell role="DEPARTMENT_LEAD" user={userProp}>
        <div className="max-w-4xl mx-auto py-12 space-y-4">
          <Link
            href="/department-lead/members"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Members
          </Link>
          <EmptyState
            title="Member Not Found"
            description="The requested user is not an active member of your club."
          />
        </div>
      </AppShell>
    );
  }

  const { member, metrics, taskHistory, recentEvaluations, trendData } = performance;

  const taskData: MemberTaskRow[] = taskHistory.map((t) => ({
    taskId: t.taskId,
    title: t.title,
    assignedAt: new Date(t.assignedAt).toLocaleDateString(),
    dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No Due Date',
    status: t.status,
    notes: t.notes,
    rating: t.evaluation ? `★ ${t.evaluation.rating}` : 'Unevaluated',
  }));

  const columns = [
    {
      header: 'Task Title',
      accessor: (row: MemberTaskRow) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{row.title}</span>
      ),
    },
    {
      header: 'Assigned At',
      accessor: (row: MemberTaskRow) => (
        <span className="text-sm text-slate-500">{row.assignedAt}</span>
      ),
    },
    {
      header: 'Due Date',
      accessor: (row: MemberTaskRow) => (
        <span className="text-sm text-slate-500">{row.dueDate}</span>
      ),
    },
    {
      header: 'Completion Status',
      accessor: (row: MemberTaskRow) => {
        const typeMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
          PENDING: 'neutral',
          SUBMITTED: 'warning',
          APPROVED: 'success',
          REJECTED: 'error',
        };
        return <StatusBadge label={row.status} type={typeMap[row.status] || 'neutral'} />;
      },
    },
    {
      header: 'Rating Score',
      accessor: (row: MemberTaskRow) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.rating !== 'Unevaluated' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'text-slate-400'}`}>
          {row.rating}
        </span>
      ),
    },
  ];

  // SVG dimensions for trend chart
  const width = 500;
  const height = 150;
  const padding = 25;

  return (
    <AppShell role="DEPARTMENT_LEAD" user={userProp}>
      <div className="space-y-6 animate-in fade-in duration-350">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/department-lead/members"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Members
          </Link>
        </div>

        <SectionHeader
          title={member.fullName}
          description="View active assignments, completion metrics, and rating summaries."
        />

        {/* Member Info Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{member.fullName}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-slate-400" />
                {member.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 px-4 py-3 rounded-lg text-center">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider">
              Completion Rate
            </span>
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {metrics.completionRate}%
            </span>
          </div>
        </div>

        {/* SECTION 1: TASK ACTIVITY */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Task Activity Stats
          </h3>
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard
              title="Assigned Tasks"
              value={metrics.assignedCount}
              icon={FileText}
            />
            <StatCard
              title="Completed Tasks"
              value={metrics.completedCount}
              icon={CheckSquare}
            />
            <StatCard
              title="Completion Rate"
              value={`${metrics.completionRate}%`}
              icon={TrendingUp}
            />
          </div>
        </div>

        {/* SECTION 2: EVALUATION STATS */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Evaluation Grades
          </h3>
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard
              title="Average Rating Score"
              value={metrics.averageRating > 0 ? `★ ${metrics.averageRating.toFixed(2)}` : 'N/A'}
              icon={Award}
            />
            <StatCard
              title="Evaluated Tasks"
              value={metrics.evaluatedCount}
              icon={CheckSquare}
            />
            <StatCard
              title="Pending Review"
              value={metrics.pendingEvaluations}
              icon={Clock}
            />
          </div>
        </div>

        {/* TWO-COLUMN ANALYTICS LAYOUT */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Side: Rating Trend & Task history */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Performance Rating Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                History of ratings over consecutive evaluations in this club.
              </p>

              {trendData.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center p-6">
                  <AlertCircle className="h-8 w-8 text-amber-500 mb-2.5" />
                  <span className="text-sm font-semibold text-slate-850 dark:text-slate-200 block">
                    Insufficient Data Trend
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-sm">
                    More evaluations are needed to show a performance trend. Member needs at least 2 evaluations in this department.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[450px] flex items-center justify-center p-2">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl h-auto">
                      {[1, 2, 3, 4, 5].map((level) => {
                        const y = height - padding - ((level - 1) / 4) * (height - 2 * padding);
                        return (
                          <g key={level} className="opacity-40">
                            <line
                              x1={padding}
                              y1={y}
                              x2={width - padding}
                              y2={y}
                              stroke="currentColor"
                              className="text-slate-200 dark:text-slate-800"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={padding - 10}
                              y={y + 4}
                              textAnchor="end"
                              className="text-[10px] fill-slate-400 font-medium"
                            >
                              ★{level}
                            </text>
                          </g>
                        );
                      })}

                      {(() => {
                        const points = trendData.map((d, index) => {
                          const x = padding + (index / (trendData.length - 1)) * (width - 2 * padding);
                          const y = height - padding - ((d.rating - 1) / 4) * (height - 2 * padding);
                          return { x, y, ...d };
                        });

                        const linePath = points
                          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                          .join(' ');

                        const areaPath = `${linePath} L ${points[points.length - 1].x} ${
                          height - padding
                        } L ${points[0].x} ${height - padding} Z`;

                        return (
                          <g>
                            <defs>
                              <linearGradient id="leadChartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#leadChartGrad)" />
                            <path
                              d={linePath}
                              fill="none"
                              stroke="#4f46e5"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {points.map((p, idx) => (
                              <g key={idx} className="group cursor-pointer">
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="5"
                                  className="fill-white stroke-indigo-650 dark:stroke-indigo-400 stroke-[3px]"
                                />
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="8"
                                  className="fill-indigo-650 opacity-0 group-hover:opacity-20 transition"
                                />
                                <foreignObject
                                  x={p.x - 60}
                                  y={p.y - 45}
                                  width="120"
                                  height="35"
                                  className="overflow-visible pointer-events-none opacity-0 group-hover:opacity-100 transition duration-150"
                                >
                                  <div className="bg-slate-900 text-white text-[9px] font-semibold py-1 px-1.5 rounded shadow-lg text-center border border-slate-700 leading-tight">
                                    <span className="block truncate">{p.taskTitle}</span>
                                    <span className="block font-bold text-indigo-455">Rating: ★{p.rating}</span>
                                  </div>
                                </foreignObject>
                              </g>
                            ))}
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Task History</h3>
              <DataTable
                columns={columns}
                data={taskData}
                emptyText="No tasks have been assigned to this member yet."
              />
            </div>
          </div>

          {/* Right Side: Recent Evaluation Comments */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                Recent Evaluations & Feedback
              </h3>
              {recentEvaluations.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No evaluations have been submitted for this member yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentEvaluations.slice(0, 5).map((e) => (
                    <div
                      key={e.id}
                      className="border-b border-slate-100 dark:border-slate-850 last:border-none pb-4 last:pb-0"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-xs text-slate-850 dark:text-slate-200 block truncate max-w-[120px]">
                          {e.taskTitle}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">
                          ★ {e.rating} / 5
                        </span>
                        <span className="text-[10px] text-slate-400">by {e.evaluatorName}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-350 break-words whitespace-pre-wrap">
                        {e.feedback || <em className="text-slate-450">No feedback submitted.</em>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
