"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await fetchApi("/auth/reset-password", {
        method: "POST",
        json: { token, new_password: newPassword },
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md backdrop-blur-md bg-neutral-900/40 border border-neutral-800 p-8 rounded-2xl shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-violet-500/30 bg-violet-950/20 text-xs font-semibold text-violet-400 mb-3 tracking-wide">
          CREATE NEW PASSWORD
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
          Reset Password
        </h2>
        <p className="text-sm text-neutral-400 mt-2">
          Choose a secure, strong password you haven&apos;t used before
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {success ? (
        <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm text-center">
          Password updated successfully! Redirecting you to login...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Recovery Token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 transition outline-none text-sm font-mono"
              placeholder="Paste recovery token here"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              New Password (min. 6 characters)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 transition outline-none text-sm"
              placeholder="••••••••"
              minLength={6}
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
                Saving Password...
              </span>
            ) : (
              "Save & Continue"
            )}
          </button>
        </form>
      )}

      <div className="mt-8 pt-6 border-t border-neutral-800/60 text-center text-xs text-neutral-400">
        <Link
          href="/login"
          className="font-semibold text-violet-400 hover:text-violet-300 transition"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="w-full max-w-md bg-neutral-900/40 border border-neutral-800 p-8 rounded-2xl animate-pulse text-center text-neutral-400">
          Loading Reset Form...
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
