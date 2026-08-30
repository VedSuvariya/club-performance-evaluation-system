'use client';

import { useState } from 'react';
import { ClubDirectoryItem } from '@/lib/database/swc';
import { DataTable } from '@/components/dashboard/components';
import { Award, CheckSquare, BarChart3 } from 'lucide-react';

interface SwcPerformanceClientProps {
  clubs: ClubDirectoryItem[];
}

export function SwcPerformanceClient({ clubs }: SwcPerformanceClientProps) {
  const [metric, setMetric] = useState<'rating' | 'completion'>('rating');

  // Filter out clubs with no members/activities to avoid skewing comparison chart
  const activeComparisonClubs = clubs.filter((c) => c.memberCount > 0);

  // SVG Chart Config
  const width = 600;
  const height = 220;
  const paddingLeft = 140;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartWidth = width - paddingLeft - paddingRight;

  const columns = [
    {
      header: 'Club Name',
      accessor: (row: ClubDirectoryItem) => (
        <span className="font-semibold text-slate-900 dark:text-white block">
          {row.name}
        </span>
      ),
    },
    {
      header: 'Club President',
      accessor: (row: ClubDirectoryItem) => (
        <span className="text-slate-650 dark:text-slate-350">{row.presidentName}</span>
      ),
    },
    {
      header: 'Active Members',
      accessor: (row: ClubDirectoryItem) => (
        <span className="text-slate-650 dark:text-slate-350">{row.memberCount}</span>
      ),
    },
    {
      header: 'Completion Rate',
      accessor: (row: ClubDirectoryItem) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${row.completionRate}%` }}
            />
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {row.completionRate}%
          </span>
        </div>
      ),
    },
    {
      header: 'Average Rating Score',
      accessor: (row: ClubDirectoryItem) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.averageRating > 0 ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350' : 'bg-slate-50 dark:bg-slate-900 text-slate-500'}`}>
          ★ {row.averageRating > 0 ? row.averageRating.toFixed(2) : 'N/A'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric selection controls */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-650" />
          Club Performance Comparison
        </h3>
        <div className="flex gap-2 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg">
          <button
            onClick={() => setMetric('rating')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              metric === 'rating'
                ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm'
                : 'text-slate-550'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Average Rating
          </button>
          <button
            onClick={() => setMetric('completion')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              metric === 'completion'
                ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm'
                : 'text-slate-550'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Completion Rate
          </button>
        </div>
      </div>

      {/* SVG Comparison Horizontal Bar Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-6">
          {metric === 'rating' ? 'System-wide Average Evaluation Grades' : 'Global Task Completion Rates (%)'}
        </h4>

        {activeComparisonClubs.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            No active club evaluations logged yet.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[550px] flex justify-center py-2">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl h-auto">
                {/* Y-axis grid lines */}
                {[0, 25, 50, 75, 100].map((percent) => {
                  const x = paddingLeft + (percent / 100) * chartWidth;
                  return (
                    <g key={percent} className="opacity-40">
                      <line
                        x1={x}
                        y1={paddingTop}
                        x2={x}
                        y2={height - paddingBottom}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={x}
                        y={height - paddingBottom + 12}
                        textAnchor="middle"
                        className="text-[9px] fill-slate-400 font-medium"
                      >
                        {metric === 'rating' ? `${(percent / 100) * 5}` : `${percent}%`}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {activeComparisonClubs.map((club, index) => {
                  const barHeight = 24;
                  const gap = 14;
                  const y = paddingTop + index * (barHeight + gap);
                  
                  // Calculate width ratio
                  const value = metric === 'rating' ? club.averageRating : club.completionRate;
                  const maxPossible = metric === 'rating' ? 5 : 100;
                  const barWidth = maxPossible > 0 ? (value / maxPossible) * chartWidth : 0;

                  return (
                    <g key={club.id} className="group">
                      {/* Club Name Label */}
                      <text
                        x={paddingLeft - 10}
                        y={y + barHeight / 2 + 3}
                        textAnchor="end"
                        className="text-[10px] font-semibold fill-slate-700 dark:fill-slate-350 truncate max-w-[120px]"
                      >
                        {club.name.length > 22 ? `${club.name.slice(0, 20)}...` : club.name}
                      </text>

                      {/* Background Bar track */}
                      <rect
                        x={paddingLeft}
                        y={y}
                        width={chartWidth}
                        height={barHeight}
                        rx="4"
                        className="fill-slate-50 dark:fill-slate-900/50"
                      />

                      {/* Value Bar */}
                      <rect
                        x={paddingLeft}
                        y={y}
                        width={Math.max(barWidth, 2)}
                        height={barHeight}
                        rx="4"
                        className="fill-indigo-600 dark:fill-indigo-500 opacity-90 group-hover:opacity-100 transition duration-150"
                      />

                      {/* Value Badge Text */}
                      <text
                        x={paddingLeft + Math.max(barWidth, 2) + 6}
                        y={y + barHeight / 2 + 3.5}
                        className="text-[9px] font-bold fill-indigo-650 dark:fill-indigo-400"
                      >
                        {metric === 'rating' ? `★ ${value.toFixed(2)}` : `${value}%`}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Comparison table */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All Clubs Comparison List</h3>
        <DataTable
          columns={columns}
          data={clubs}
          emptyText="No registered clubs found."
        />
      </div>
    </div>
  );
}
