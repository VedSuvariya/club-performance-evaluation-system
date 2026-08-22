'use client';

import { useActionState, useState } from 'react';
import { loginAction, LoginState } from '@/features/authentication/actions';
import { Eye, EyeOff, Lock, Mail, Loader2, ShieldAlert } from 'lucide-react';

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md">
        
        {/* Branding Headers */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Lock className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            System Sign In
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Club Performance Evaluation & Reporting
          </p>
        </div>

        {/* Form Container */}
        <form className="mt-8 space-y-6" action={formAction}>
          {/* General Auth Failure Message */}
          {state?.message && (
            <div className="flex items-center gap-3 rounded-lg border border-red-900/30 bg-red-950/20 p-4 text-sm text-red-400">
              <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
              <span>{state.message}</span>
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-xs">
            {/* Email Field */}
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  className="block w-full rounded-lg border border-slate-850 bg-slate-950/50 py-3 pr-3 pl-10 text-white placeholder-slate-500 shadow-inner outline-hidden transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="name@university.edu"
                />
              </div>
              {state?.errors?.email && (
                <p className="mt-1 text-xs text-red-400">{state.errors.email[0]}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="block w-full rounded-lg border border-slate-850 bg-slate-950/50 py-3 pr-12 pl-10 text-white placeholder-slate-500 shadow-inner outline-hidden transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isPending}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-350 focus:outline-hidden disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {state?.errors?.password && (
                <p className="mt-1 text-xs text-red-400">{state.errors.password[0]}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/10 transition-all duration-200 hover:from-indigo-600 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
