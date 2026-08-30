'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Award,
  UserCircle,
  ArrowLeftRight,
  ArrowRightLeft,
  Users,
  TrendingUp,
  FileBarChart,
  Building,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/features/authentication/actions';

export type UserRole = 'MEMBER' | 'DEPARTMENT_LEAD' | 'CLUB_PRESIDENT' | 'STUDENT_WELFARE_COUNCIL';

interface SidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_CONFIGS: Record<UserRole, NavItem[]> = {
  MEMBER: [
    { label: 'Dashboard', href: '/member', icon: LayoutDashboard },
    { label: 'My Tasks', href: '/member/tasks', icon: CheckSquare },
    { label: 'My Evaluations', href: '/member/evaluations', icon: Award },
    { label: 'Performance', href: '/member/performance', icon: TrendingUp },
    { label: 'My Profile', href: '/member/profile', icon: UserCircle },
    { label: 'Club Transfer', href: '/member/transfers', icon: ArrowLeftRight },
  ],
  DEPARTMENT_LEAD: [
    { label: 'Dashboard', href: '/department-lead', icon: LayoutDashboard },
    { label: 'Tasks', href: '/department-lead/tasks', icon: CheckSquare },
    { label: 'Members', href: '/department-lead/members', icon: Users },
    { label: 'Evaluations', href: '/department-lead/evaluations', icon: Award },
    { label: 'Performance', href: '/department-lead/performance', icon: TrendingUp },
    { label: 'Reports', href: '/department-lead/reports', icon: FileBarChart },
  ],
  CLUB_PRESIDENT: [
    { label: 'Dashboard', href: '/club-president', icon: LayoutDashboard },
    { label: 'Club Overview', href: '/club-president/club', icon: Building },
    { label: 'Club Transfers', href: '/club-president/club-transfers', icon: ArrowRightLeft },
    { label: 'Members', href: '/club-president/members', icon: Users },
    { label: 'Performance', href: '/club-president/performance', icon: TrendingUp },
    { label: 'Reports', href: '/club-president/reports', icon: FileBarChart },
  ],
  STUDENT_WELFARE_COUNCIL: [
    { label: 'Dashboard', href: '/swc', icon: LayoutDashboard },
    { label: 'Clubs', href: '/swc/clubs', icon: Building },
    { label: 'Evaluations', href: '/swc/performance', icon: Award },
    { label: 'Reports', href: '/swc/reports', icon: FileBarChart },
  ],
};

export function Sidebar({ role, collapsed = false, onToggleCollapse, className }: SidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_CONFIGS[role] || [];

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sm tracking-wide text-slate-800 dark:text-white truncate">
              ClubEvaluation
            </span>
          )}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer / Sign Out */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800">
        <form action={logoutAction}>
          <button
            type="submit"
            title={collapsed ? 'Sign Out' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
