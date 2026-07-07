"use client";

import React, { useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi("/auth/forgot-password", {
        method: "POST",
        json: { email },
      });
      setSuccess(true);
      if (response.data?.dev_reset_token) {
        setDevToken(response.data.dev_reset_token);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Forgot Card */}
      <div className="w-full max-w-md backdrop-blur-md bg-neutral-900/40 border border-neutral-800 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-violet-500/30 bg-violet-950/20 text-xs font-semibold text-violet-400 mb-3 tracking-wide">
            RECOVER PASSWORD
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            Forgot Password
          </h2>
          <p className="text-sm text-neutral-400 mt-2">
            No worries! Enter your email to recover your account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm text-center">
              We have generated a password reset request.
            </div>

            {devToken && (
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs space-y-2">
                <span className="font-semibold text-amber-400 block">DEVELOPMENT RESET SHORTCUT:</span>
                <p className="text-neutral-400">
                  Since this is local dev, copy this token to apply it on the reset page:
                </p>
                <textarea
                  readOnly
                  value={devToken}
                  className="w-full h-20 bg-neutral-900 border border-neutral-800 p-2 rounded text-neutral-300 font-mono focus:outline-none resize-none"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <div className="text-right">
                  <Link
                    href={`/reset-password?token=${encodeURIComponent(devToken)}`}
                    className="inline-block text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
                  >
                    Go to Reset Password &rarr;
                  </Link>
                </div>
              </div>
            )}

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-neutral-400 hover:text-neutral-300 transition"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
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
                  Submitting...
                </span>
              ) : (
                "Send Reset Instructions"
              )}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-8 pt-6 border-t border-neutral-800/60 text-center text-xs text-neutral-400">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-violet-400 hover:text-violet-300 transition"
            >
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
