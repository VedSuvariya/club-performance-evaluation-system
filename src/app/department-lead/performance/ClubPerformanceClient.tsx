'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClubMemberPerformance } from '@/lib/database/performance';
import { DataTable } from '@/components/dashboard/components';
import { Search, ArrowUpDown, Eye } from 'lucide-react';

interface ClubPerformanceClientProps {
  members: ClubMemberPerformance[];
}

type SortField = 'fullName' | 'completionRate' | 'averageRating';
type SortOrder = 'asc' | 'desc';

export function ClubPerformanceClient({ members }: ClubPerformanceClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterRating, setFilterRating] = useState<string>('all');

  // Handle Sort Toggle
  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to high-to-low for ratings/rates
    }
  };

  // Filter and Sort Data
  const processedMembers = members
    .filter((m) => {
      const matchesSearch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const rating = m.averageRating;
      if (filterRating === 'high') return matchesSearch && rating >= 4.0;
      if (filterRating === 'mid') return matchesSearch && rating >= 3.0 && rating < 4.0;
      if (filterRating === 'low') return matchesSearch && rating > 0 && rating < 3.0;
      if (filterRating === 'none') return matchesSearch && rating === 0;
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'fullName') {
        comparison = a.fullName.localeCompare(b.fullName);
      } else {
        comparison = a[sortBy] - b[sortBy];
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const columns = [
    {
      header: 'Member Name',
      accessor: (row: ClubMemberPerformance) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-white block">
            {row.fullName}
          </span>
          <span className="text-xs text-slate-500 block truncate max-w-[150px] sm:max-w-none">
            {row.email}
          </span>
        </div>
      ),
    },
    {
      header: 'Joined On',
      accessor: (row: ClubMemberPerformance) => (
        <span className="text-xs text-slate-500">
          {new Date(row.joinedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Assigned / Completed',
      accessor: (row: ClubMemberPerformance) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-350">
            {row.completedCount} / {row.assignedCount}
          </span>
          <span className="text-xs text-slate-400">tasks</span>
        </div>
      ),
    },
    {
      header: 'Completion Rate',
      accessor: (row: ClubMemberPerformance) => {
        const rate = row.completionRate;
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
              <div
                className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-slate-400'}`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${rate >= 75 ? 'text-emerald-600 dark:text-emerald-450' : rate >= 50 ? 'text-amber-600 dark:text-amber-450' : 'text-slate-500'}`}>
              {rate}%
            </span>
          </div>
        );
      },
    },
    {
      header: 'Average Rating',
      accessor: (row: ClubMemberPerformance) => (
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.averageRating > 0 ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350' : 'bg-slate-50 dark:bg-slate-900 text-slate-500'}`}>
            ★ {row.averageRating > 0 ? row.averageRating.toFixed(2) : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: ClubMemberPerformance) => (
        <Link
          href={`/department-lead/members/${row.id}`}
          className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/30 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 dark:text-slate-350 dark:hover:text-indigo-400 transition"
        >
          <Eye className="h-3.5 w-3.5" />
          View Performance
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          Club Member Performance Summary
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400">
          Monitor completion records and average performance evaluations of members in your club.
        </p>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search member name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
          />
        </div>

        {/* Filters & Sorting buttons */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Rating filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Rating:</span>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Grades</option>
              <option value="high">Excellent (★4.0+)</option>
              <option value="mid">Meets Expectation (★3.0-3.9)</option>
              <option value="low">Needs Work (★1.0-2.9)</option>
              <option value="none">No Evaluations</option>
            </select>
          </div>

          {/* Sort Toggles */}
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-950">
            <button
              onClick={() => toggleSort('fullName')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                sortBy === 'fullName'
                  ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-550'
              }`}
            >
              Name
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => toggleSort('completionRate')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                sortBy === 'completionRate'
                  ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-550'
              }`}
            >
              Completions
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => toggleSort('averageRating')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                sortBy === 'averageRating'
                  ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-550'
              }`}
            >
              Rating
              <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={processedMembers}
        emptyText="No members found matching the active search or filters."
      />
    </div>
  );
}
