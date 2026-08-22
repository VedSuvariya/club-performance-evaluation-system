import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// 1. StatCard
// ==========================================
interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtext,
  trend,
  trendValue,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm transition hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
        {(subtext || trend) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trend === 'up' && (
              <span className="flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3" />
                {trendValue}
              </span>
            )}
            {trend === 'down' && (
              <span className="flex items-center gap-0.5 font-medium text-rose-600 dark:text-rose-400">
                <ArrowDownRight className="h-3 w-3" />
                {trendValue}
              </span>
            )}
            {trend === 'neutral' && (
              <span className="flex items-center gap-0.5 font-medium text-slate-500 dark:text-slate-400">
                <Minus className="h-3 w-3" />
                {trendValue}
              </span>
            )}
            <span className="text-slate-500 dark:text-slate-400">{subtext}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. SectionHeader
// ==========================================
interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ==========================================
// 3. DataTable Shell
// ==========================================
interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyText?: string;
  className?: string;
}

export function DataTable<T>({ columns, data, emptyText = 'No records found.', className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 shadow-sm', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 font-semibold text-xs tracking-wider uppercase',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={cn('px-6 py-4 align-middle', col.className)}>
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 4. StatusBadge
// ==========================================
type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  type?: StatusType;
}

export function StatusBadge({ label, type = 'neutral' }: StatusBadgeProps) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    error: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
        styles[type]
      )}
    >
      {label}
    </span>
  );
}

// ==========================================
// 5. ProgressIndicator
// ==========================================
interface ProgressIndicatorProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
}

export function ProgressIndicator({ value, max = 100, label, showPercent = true }: ProgressIndicatorProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          {label && <span>{label}</span>}
          {showPercent && <span>{percentage}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ==========================================
// 6. ActivityItem
// ==========================================
interface ActivityItemProps {
  title: string;
  description: string;
  timestamp: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export function ActivityItem({ title, description, timestamp, icon: Icon, iconColor }: ActivityItemProps) {
  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute top-1.5 bottom-0 left-[9px] w-0.5 bg-slate-200 dark:bg-slate-800 last:hidden" />
      
      {/* Timeline Bullet */}
      <div className="absolute top-1 left-0 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800">
        {Icon ? (
          <Icon className={cn('h-2.5 w-2.5', iconColor || 'text-slate-500')} />
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        )}
      </div>

      <div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
          <span className="text-xs text-slate-400">{timestamp}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ==========================================
// 7. ChartCard
// ==========================================
interface ChartCardProps {
  title: string;
  description?: string;
  className?: string;
}

export function ChartCard({ title, description, className }: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm',
        className
      )}
    >
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      
      {/* Elegant Mock SVG Chart representing a line area graph */}
      <div className="mt-6 flex h-48 items-end justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/10 p-4">
        <svg className="h-full w-full overflow-visible" viewBox="0 0 400 150" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <line x1="0" y1="37.5" x2="400" y2="37.5" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
          <line x1="0" y1="75" x2="400" y2="75" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
          <line x1="0" y1="112.5" x2="400" y2="112.5" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
          
          {/* Gradient area */}
          <path
            d="M 0 130 C 50 110, 80 50, 130 60 C 180 70, 220 120, 270 90 C 320 60, 350 20, 400 40 L 400 150 L 0 150 Z"
            fill="url(#chartGradient)"
          />
          
          {/* Main Chart Line */}
          <path
            d="M 0 130 C 50 110, 80 50, 130 60 C 180 70, 220 120, 270 90 C 320 60, 350 20, 400 40"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Dots at peaks */}
          <circle cx="130" cy="60" r="4" fill="#4f46e5" stroke="white" strokeWidth="1.5" />
          <circle cx="270" cy="90" r="4" fill="#4f46e5" stroke="white" strokeWidth="1.5" />
          <circle cx="400" cy="40" r="4" fill="#4f46e5" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] uppercase font-semibold tracking-wider text-slate-400">
        <span>Jan</span>
        <span>Mar</span>
        <span>May</span>
        <span>Jul</span>
        <span>Sep</span>
        <span>Nov</span>
      </div>
    </div>
  );
}

// ==========================================
// 8. QuickActionCard
// ==========================================
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function QuickActionCard({ title, description, icon: Icon, onClick, className }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mt-4 font-semibold text-slate-900 dark:text-white text-sm">{title}</h4>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-normal">{description}</p>
    </button>
  );
}
