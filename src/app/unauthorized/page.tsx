'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-955/30 text-red-500 border border-red-500/20">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">
          Access Denied
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          You do not have the required role permissions to access this area. If you believe this is an error, please contact your administrator.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-slate-800 py-2.5 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-500/50"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
