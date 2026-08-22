'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Sun, Moon, Menu, User, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { logoutAction } from '@/features/authentication/actions';
import { cn } from '@/lib/utils';

interface TopBarProps {
  user: {
    fullName: string;
    email: string;
    role: string;
  };
  onOpenMobileMenu?: () => void;
  className?: string;
}

export function TopBar({ user, onOpenMobileMenu, className }: TopBarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Generate breadcrumb titles from pathname segments
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, idx) => {
    const href = '/' + pathSegments.slice(0, idx + 1).join('/');
    const title = segment
      .replace(/-/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
    return { title, href, isLast: idx === pathSegments.length - 1 };
  });

  const getRoleDisplayName = (role: string) => {
    return role.replace(/_/g, ' ');
  };

  return (
    <header
      className={cn(
        'flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 px-4 md:px-6 backdrop-blur-md sticky top-0 z-40',
        className
      )}
    >
      {/* Left section: Hamburguer menu & Breadcrumbs */}
      <div className="flex items-center gap-4">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            type="button"
            className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Breadcrumb Nav */}
        <nav className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <span className="text-slate-300 dark:text-slate-700">/</span>}
              {crumb.isLast ? (
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{crumb.title}</span>
              ) : (
                <span className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  {crumb.title}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right section: Theme toggler, Notification bell, User dropdown */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          type="button"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition relative overflow-hidden"
          aria-label={theme === 'dark' ? 'Activate light mode' : 'Activate dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:rotate-90 dark:scale-100" />
          ) : (
            <Moon className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-100" />
          )}
        </button>

        {/* Notifications Indicator Placeholder */}
        <button
          type="button"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition relative"
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-950" />
        </button>

        {/* User Dropdown Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

        {/* User Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            className="flex items-center gap-2 rounded-full p-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-800">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </div>
            <span className="hidden md:block text-xs font-semibold text-slate-800 dark:text-slate-200 text-left">
              <span className="block max-w-[120px] truncate">{user.fullName || 'User Profile'}</span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                {getRoleDisplayName(user.role)}
              </span>
            </span>
            <ChevronDown className="hidden md:block h-3 w-3 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay clickable mask to close dropdown */}
              <div onClick={() => setDropdownOpen(false)} className="fixed inset-0 z-30" />
              
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-lg ring-1 ring-black/5 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-900 text-xs">
                  <span className="block font-bold text-slate-900 dark:text-white">{user.fullName}</span>
                  <span className="block text-slate-400 truncate">{user.email}</span>
                </div>
                <div className="py-1">
                  <div className="flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Role: {getRoleDisplayName(user.role)}
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-900 pt-1">
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
