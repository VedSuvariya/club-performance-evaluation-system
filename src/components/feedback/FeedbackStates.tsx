import Link from "next/link";
import { AlertCircle, Inbox, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ==========================================
// 1. EmptyState
// ==========================================

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/10 p-10 text-center shadow-sm",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
        <Inbox className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400 leading-normal">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          type="button"
          className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ==========================================
// 2. LoadingState
// ==========================================

interface LoadingStateProps {
  type?: "card-grid" | "table" | "timeline";
  count?: number;
  className?: string;
}

export function LoadingState({
  type = "card-grid",
  count = 3,
  className,
}: LoadingStateProps) {
  const skeletons = Array.from({ length: count });

  if (type === "table") {
    return (
      <div
        className={cn(
          "w-full border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30 overflow-hidden",
          className
        )}
      >
        <div className="bg-slate-50 dark:bg-slate-800/40 h-10 w-full animate-pulse" />

        <div className="divide-y divide-slate-100 dark:divide-slate-800/50 p-4">
          {skeletons.map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 py-3">
              <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />

              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />

              <div className="h-4 w-1/6 rounded bg-slate-200 dark:bg-slate-800 animate-pulse ms-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "timeline") {
    return (
      <div className={cn("space-y-6", className)}>
        {skeletons.map((_, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="relative flex flex-col items-center">
              <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />

              {idx < count - 1 && (
                <div className="h-12 w-0.5 bg-slate-100 dark:bg-slate-800/50 mt-2" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />

              <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {skeletons.map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 space-y-4 shadow-sm"
        >
          <div className="flex justify-between items-center">
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />

            <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>

          <div className="h-8 w-1/2 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />

          <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 3. ErrorState
// ==========================================

interface ErrorStateProps {
  title: string;
  message: string;
  retryHref?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title,
  message,
  retryHref,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/10 p-6 shadow-sm flex flex-col sm:flex-row items-start gap-4",
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1">
        <h4 className="font-semibold text-rose-900 dark:text-rose-200 text-base">
          {title}
        </h4>

        <p className="text-sm text-rose-700 dark:text-rose-400 leading-normal">
          {message}
        </p>

        {retryHref && (
          <Link
            href={retryHref}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry Request
          </Link>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry Request
          </button>
        )}
      </div>
    </div>
  );
}