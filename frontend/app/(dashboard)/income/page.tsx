"use client";

import React, { useState, startTransition } from "react";
import * as Icons from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useIncome, useIncomeMutations, Income } from "@/hooks/use-income";
import ConfirmModal from "@/components/ConfirmModal";

export default function IncomePage() {
  // Filters state
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Active query hook
  const { incomes, meta, loading, refetch } = useIncome({
    page,
    limit,
    from: from || undefined,
    to: to || undefined,
  });

  const { createIncome, deleteIncome, loading: mutationLoading } = useIncomeMutations();

  // Drawer & Form states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenAddDrawer = () => {
    setSource("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]); // today
    setNotes("");
    setIsRecurring(false);
    setFormError(null);
    setDrawerOpen(true);
  };

  // Confirm modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    try {
      await deleteIncome(confirmDeleteId);
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to delete income log");
    } finally {
      setDeleteLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handleClearFilters = () => {
    setFrom("");
    setTo("");
    setPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("Please enter a valid, positive amount.");
      return;
    }

    if (!source.trim()) {
      setFormError("Please enter a source name.");
      return;
    }

    if (!date) {
      setFormError("Please select a date.");
      return;
    }

    try {
      await createIncome({
        source: source.trim(),
        amount: numericAmount,
        date,
        notes: notes.trim() || null,
        is_recurring: isRecurring,
      });
      setDrawerOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong. Please try again.");
    }
  };

  const totalPages = Math.ceil(meta.total / limit);

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            Inflow & Income
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Track salaries, dividends, secondary revenue, and recurring digital income logs
          </p>
        </div>
        <button
          onClick={handleOpenAddDrawer}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-neutral-50 shadow-lg shadow-violet-500/25 cursor-pointer transition-all duration-200"
        >
          <Icons.Plus className="w-4 h-4" />
          Record Income
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-neutral-900/20 border border-neutral-800/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-neutral-400 font-medium">Filter date range:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 outline-none transition cursor-pointer"
            title="From Date"
          />
          <span className="text-neutral-600 text-xs">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 outline-none transition cursor-pointer"
            title="To Date"
          />
        </div>
        {(from || to) && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
          >
            <Icons.XCircle className="w-3.5 h-3.5" />
            Clear Filter
          </button>
        )}
      </div>

      {/* Main Income Grid/Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 w-full bg-neutral-900/50 border border-neutral-800/60 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : incomes.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-neutral-800/60 rounded-2xl bg-neutral-900/10 p-16 text-center">
          <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-500 mb-4">
            <Icons.TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-200">No income records</h3>
          <p className="text-sm text-neutral-400 mt-1 max-w-sm">
            Keep your budgets and metrics healthy by tracking salary inflows and investment profits.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-800/60 rounded-2xl bg-neutral-900/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/40 text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Inflow Source</th>
                <th className="py-4 px-5">Type</th>
                <th className="py-4 px-5">Notes</th>
                <th className="py-4 px-5 text-right">Amount</th>
                <th className="py-4 px-5 w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-sm">
              {incomes.map((inc) => (
                <tr key={inc.id} className="hover:bg-neutral-900/30 transition text-neutral-300">
                  <td className="py-4 px-5 whitespace-nowrap text-xs text-neutral-400">
                    {new Date(inc.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-4 px-5 font-semibold text-neutral-100 max-w-[200px] truncate">
                    {inc.source}
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    {inc.is_recurring ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-950/30 border border-violet-500/20 text-violet-400">
                        <Icons.RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                        Recurring
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800/30 border border-neutral-700/20 text-neutral-400">
                        One-off
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 max-w-[220px] truncate text-neutral-400">
                    {inc.notes || "—"}
                  </td>
                  <td className="py-4 px-5 text-right font-bold text-emerald-400 whitespace-nowrap">
                    +₹{Number(inc.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => handleDelete(inc.id)}
                      className="p-1.5 rounded hover:bg-neutral-800 text-rose-500/60 hover:text-rose-400 transition cursor-pointer"
                      title="Delete Entry"
                    >
                      <Icons.Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-900 text-sm">
          <span className="text-xs text-neutral-500">
            Showing Page {page} of {totalPages} ({meta.total} total logs)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => startTransition(() => setPage((p) => Math.max(1, p - 1)))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            >
              <Icons.ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => startTransition(() => setPage((p) => Math.min(totalPages, p + 1)))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            >
              <Icons.ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Form Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-40 cursor-pointer"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-neutral-100">Record Income Inflow</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Document revenue logs to augment financial statistics
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                >
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                {formError && (
                  <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-400 text-sm">
                    {formError}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Amount Inflow (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-neutral-500 font-medium">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl pl-9 pr-4 py-3.5 text-lg font-semibold text-neutral-100 placeholder-neutral-700 outline-none transition"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Income Source / Payee
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition"
                    placeholder="e.g. Acme Salary, Stock Dividend, Freelance"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Date Received
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-300 outline-none transition cursor-pointer"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Notes / Description
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-24 bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition resize-none"
                    placeholder="Describe transaction details (optional)..."
                  />
                </div>

                {/* Recurring */}
                <div className="flex items-center gap-3 p-4 bg-neutral-950/40 border border-neutral-800/80 rounded-xl">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-neutral-800 text-violet-600 focus:ring-violet-500 bg-neutral-950 accent-violet-600 cursor-pointer w-4 h-4"
                  />
                  <div className="text-left">
                    <label htmlFor="isRecurring" className="block text-xs font-bold text-neutral-200 cursor-pointer">
                      Mark as recurring monthly deposit
                    </label>
                    <span className="block text-[10px] text-neutral-500 mt-0.5">
                      Indicates that this inflow repeats periodically.
                    </span>
                  </div>
                </div>
              </form>

              <div className="p-6 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  disabled={mutationLoading}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-sm font-semibold text-neutral-400 hover:text-neutral-200 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={mutationLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-sm font-semibold text-neutral-50 rounded-xl transition cursor-pointer"
                >
                  {mutationLoading ? "Submitting..." : "Record Inflow"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Income Entry"
        message="This income record will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
