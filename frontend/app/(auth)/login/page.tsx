"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/stores/auth-store";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md backdrop-blur-md bg-neutral-900/40 border border-neutral-800 p-8 rounded-2xl shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-violet-500/30 bg-violet-950/20 text-xs font-semibold text-violet-400 mb-3 tracking-wide">
          YOUR AI FINANCE ASSISTANT
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
          Welcome back to FinAI
        </h2>
        <p className="text-sm text-neutral-400 mt-2">
          Enter your details to access your account dashboard
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 transition outline-none text-sm"
            placeholder="name@example.com"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition"
            >
              Forgot Password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 transition outline-none text-sm"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-neutral-50 font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/25 cursor-pointer relative overflow-hidden flex items-center justify-center text-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-neutral-800/60 text-center text-xs text-neutral-400">
        New to FinAI?{" "}
        <Link
          href="/register"
          className="font-semibold text-violet-400 hover:text-violet-300 transition"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-md bg-neutral-900/40 border border-neutral-800 p-8 rounded-2xl animate-pulse text-center text-neutral-400">
          Loading Sign In...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
