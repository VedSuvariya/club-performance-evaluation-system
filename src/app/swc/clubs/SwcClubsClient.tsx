'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClubDirectoryItem } from '@/lib/database/swc';
import { DataTable, StatusBadge } from '@/components/dashboard/components';
import { Search, ArrowUpDown, Eye } from 'lucide-react';

interface SwcClubsClientProps {
  clubs: ClubDirectoryItem[];
}

type SortField = 'name' | 'memberCount' | 'completionRate' | 'averageRating';
type SortOrder = 'asc' | 'desc';

export function SwcClubsClient({ clubs }: SwcClubsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const processedClubs = clubs
    .filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterStatus === 'active') return matchesSearch && c.isActive;
      if (filterStatus === 'inactive') return matchesSearch && !c.isActive;
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a[sortBy] - b[sortBy];
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const columns = [
    {
      header: 'Club Name',
      accessor: (row: ClubDirectoryItem) => (
        <div>
          <Link
            href={`/swc/clubs/${row.id}`}
            className="font-semibold text-slate-900 dark:text-white hover:text-indigo-650 hover:underline block"
          >
            {row.name}
          </Link>
          <span className="text-xs text-slate-500 block truncate max-w-[200px] sm:max-w-none">
            {row.description || 'No description.'}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: ClubDirectoryItem) => (
        <StatusBadge label={row.isActive ? 'ACTIVE' : 'INACTIVE'} type={row.isActive ? 'success' : 'neutral'} />
      ),
    },
    {
      header: 'Leadership Roles',
      accessor: (row: ClubDirectoryItem) => (
        <div className="text-xs text-slate-650 dark:text-slate-350 space-y-0.5">
          <div><strong className="text-slate-400">President:</strong> {row.presidentName}</div>
          <div><strong className="text-slate-400">Lead:</strong> {row.leadName}</div>
        </div>
      ),
    },
    {
      header: 'Active Members',
      accessor: (row: ClubDirectoryItem) => (
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {row.memberCount} members
        </span>
      ),
    },
    {
      header: 'Completion Rate',
      accessor: (row: ClubDirectoryItem) => {
        const rate = row.completionRate;
        return (
          <div className="flex items-center gap-2">
            <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
              <div
                className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-slate-400'}`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
              {rate}%
            </span>
          </div>
        );
      },
    },
    {
      header: 'Average Rating',
      accessor: (row: ClubDirectoryItem) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${row.averageRating > 0 ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350' : 'bg-slate-50 dark:bg-slate-900 text-slate-500'}`}>
          ★ {row.averageRating > 0 ? row.averageRating.toFixed(2) : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: ClubDirectoryItem) => (
        <Link
          href={`/swc/clubs/${row.id}`}
          className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/30 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 dark:text-slate-350 dark:hover:text-indigo-400 transition"
        >
          <Eye className="h-3.5 w-3.5" />
          View Details
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search club name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
          />
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort Toggles */}
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-950">
            <button
              onClick={() => toggleSort('name')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                sortBy === 'name'
                  ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-550'
              }`}
            >
              Name
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => toggleSort('memberCount')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                sortBy === 'memberCount'
                  ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-550'
              }`}
            >
              Members
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
        data={processedClubs}
        emptyText="No registered clubs found matching search/filters."
      />
    </div>
  );
}
