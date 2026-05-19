"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Zap, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh relative overflow-hidden"
      style={{ background: "var(--background)" }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-20 animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15 animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)", animationDelay: "1s" }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-10 animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)", animationDelay: "2s" }} />
      </div>

      <div className="w-full max-w-md mx-4 fade-in relative z-10">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-indigo-500/20"
            style={{ background: "var(--gradient-primary)" }}>
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">MailVerify Pro</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          {state?.error && (
            <div className="mb-6 p-3.5 rounded-lg flex items-center gap-2.5 text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#fca5a5",
              }}>
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 rounded-lg text-sm font-semibold btn-primary flex items-center justify-center gap-2 mt-2"
            >
              {pending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Secured · Internal Access Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
