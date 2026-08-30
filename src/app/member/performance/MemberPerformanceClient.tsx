'use client';

import { useState } from 'react';
import { MemberPerformanceSummary, EvaluationRecord } from '@/lib/database/performance';
import { StatCard, DataTable } from '@/components/dashboard/components';
import {
  FileText,
  CheckSquare,
  Clock,
  Award,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

interface MemberPerformanceClientProps {
  summary: MemberPerformanceSummary;
}

export function MemberPerformanceClient({ summary }: MemberPerformanceClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'low'>('all');

  const {
    totalAssigned,
    totalCompleted,
    totalEvaluated,
    pendingEvaluations,
    completionRate,
    averageRating,
    recentEvaluations,
    trendData,
  } = summary;

  // Filter evaluations based on active tab
  const filteredEvaluations = recentEvaluations.filter((e) => {
    if (activeTab === 'high') return e.rating >= 4;
    if (activeTab === 'low') return e.rating <= 2;
    return true;
  });

  const columns = [
    {
      header: 'Task Title',
      accessor: (row: EvaluationRecord) => (
        <span className="font-semibold text-slate-900 dark:text-white block">
          {row.taskTitle}
        </span>
      ),
    },
    {
      header: 'Evaluated On',
      accessor: (row: EvaluationRecord) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Evaluator',
      accessor: (row: EvaluationRecord) => (
        <span className="text-sm text-slate-650 dark:text-slate-400">
          {row.evaluatorName}
        </span>
      ),
    },
    {
      header: 'Score',
      accessor: (row: EvaluationRecord) => {
        const ratingLabel = ['Improvement', 'Needs Work', 'Meets Exp', 'Very Good', 'Excellent'][row.rating - 1];
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-350">
              ★ {row.rating} / 5
            </span>
            <span className="text-xs text-slate-500">{ratingLabel}</span>
          </div>
        );
      },
    },
    {
      header: 'Feedback / Comments',
      accessor: (row: EvaluationRecord) => (
        <span className="text-xs text-slate-650 dark:text-slate-350 block max-w-xs md:max-w-md break-words whitespace-pre-wrap">
          {row.feedback || <em className="text-slate-450">No feedback comments submitted.</em>}
        </span>
      ),
    },
  ];

  // SVG dimensions for trend chart
  const width = 500;
  const height = 150;
  const padding = 25;

  const getAverageRatingLabel = (rating: number) => {
    if (rating <= 0) return 'No evaluations yet';
    if (rating < 2.0) return 'Needs Significant Improvement';
    if (rating < 3.0) return 'Needs Improvement';
    if (rating < 4.0) return 'Meets Expectations';
    if (rating < 4.5) return 'Very Good';
    return 'Excellent';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          My Performance History & Analytics
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400">
          Track task activities, view evaluation scoring metrics, and analyze performance trends.
        </p>
      </div>

      {/* SECTION 1: TASK ACTIVITY */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
          Task Activity Indicators
        </h3>
        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard
            title="Total Assigned Tasks"
            value={totalAssigned.toString()}
            subtext="overall assigned tasks"
            trend="neutral"
            trendValue="--"
            icon={FileText}
          />
          <StatCard
            title="Total Completed Tasks"
            value={totalCompleted.toString()}
            subtext="submitted for review"
            trend="up"
            trendValue={`+${totalCompleted}`}
            icon={CheckSquare}
          />
          <StatCard
            title="Completion Rate"
            value={`${completionRate}%`}
            subtext="ratio of completions"
            trend={completionRate >= 75 ? 'up' : 'neutral'}
            trendValue="--"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* SECTION 2: EVALUATION PERFORMANCE */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Award className="h-4 w-4 text-indigo-500" />
          Evaluation Performance Metrics
        </h3>
        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard
            title="Overall Average Rating"
            value={averageRating > 0 ? `★ ${averageRating.toFixed(2)}` : 'N/A'}
            subtext={getAverageRatingLabel(averageRating)}
            trend="neutral"
            trendValue="--"
            icon={Award}
          />
          <StatCard
            title="Total Evaluated Tasks"
            value={totalEvaluated.toString()}
            subtext="rated completions"
            trend="neutral"
            trendValue="--"
            icon={CheckSquare}
          />
          <StatCard
            title="Pending Evaluations"
            value={pendingEvaluations.toString()}
            subtext="awaiting feedback reviews"
            trend={pendingEvaluations > 0 ? 'down' : 'neutral'}
            trendValue={pendingEvaluations.toString()}
            icon={Clock}
          />
        </div>
      </div>

      {/* SECTION 3: PERFORMANCE TREND */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
          Performance Rating Trend
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Historical changes in ratings over consecutive evaluations.
        </p>

        {trendData.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center p-6">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2.5" />
            <span className="text-sm font-semibold text-slate-850 dark:text-slate-200 block">
              Insufficient Data Trend
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-sm">
              More evaluations are needed to show a performance trend. You must have at least 2 evaluated tasks.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[500px] flex items-center justify-center p-2">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl h-auto">
                {/* Horizontal grid lines for ratings 1-5 */}
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

                {/* Line path */}
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
                      {/* Gradient fill */}
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#chartGrad)" />

                      {/* Stroke Line */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Dots and Tooltips */}
                      {points.map((p, idx) => (
                        <g key={idx} className="group cursor-pointer">
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            className="fill-white stroke-indigo-600 dark:stroke-indigo-400 stroke-[3px]"
                          />
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="8"
                            className="fill-indigo-650 opacity-0 group-hover:opacity-20 transition"
                          />
                          {/* Tooltip Overlay */}
                          <foreignObject
                            x={p.x - 60}
                            y={p.y - 45}
                            width="120"
                            height="35"
                            className="overflow-visible pointer-events-none opacity-0 group-hover:opacity-100 transition duration-150"
                          >
                            <div className="bg-slate-900 text-white text-[9px] font-semibold py-1 px-1.5 rounded shadow-lg text-center border border-slate-700 leading-tight">
                              <span className="block truncate">{p.taskTitle}</span>
                              <span className="block font-bold text-indigo-400">Rating: ★{p.rating}</span>
                            </div>
                          </foreignObject>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
            <div className="flex justify-between px-6 text-[10px] text-slate-400 mt-2 font-medium">
              <span>First Evaluation ({trendData[0].date})</span>
              <span>Latest Evaluation ({trendData[trendData.length - 1].date})</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: EVALUATIONS HISTORY */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Detailed Evaluations History
          </h3>
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Reviews
            </button>
            <button
              onClick={() => setActiveTab('high')}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === 'high'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              High Ratings (★4-5)
            </button>
            <button
              onClick={() => setActiveTab('low')}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === 'low'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Low Ratings (★1-2)
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredEvaluations}
          emptyText="No task evaluations match the selected filter."
        />
      </div>
    </div>
  );
}
