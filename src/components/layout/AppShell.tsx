'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, UserRole, NAV_CONFIGS } from '../navigation/Sidebar';
import { TopBar } from '../navigation/TopBar';
import { X, Shield, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/features/authentication/actions';

interface AppShellProps {
  role: UserRole;
  user: {
    fullName: string;
    email: string;
    role: string;
  };
  children: React.ReactNode;
}

export function AppShell({ role, user, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navItems = NAV_CONFIGS[role] || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* 1. Desktop Sidebar */}
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        className="shrink-0"
      />

      {/* 2. Mobile Drawer Navigation Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          {/* Backdrop mask */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Menu Panel */}
          <aside className="relative flex w-4/5 max-w-sm flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-full p-4 shadow-xl animate-in slide-in-from-left duration-250">
            {/* Close action */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-900">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="font-bold text-sm text-slate-850 dark:text-white">
                  ClubEvaluation
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Links list */}
            <nav className="flex-1 space-y-1 py-4 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer / Logout */}
            <div className="border-t border-slate-100 dark:border-slate-900 pt-4">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* 3. Main Viewport wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar */}
        <TopBar
          user={user}
          onOpenMobileMenu={() => setMobileOpen(true)}
          className="shrink-0"
        />

        {/* Content Scrolling Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/10">
          {children}
        </main>
      </div>
    </div>
  );
}
