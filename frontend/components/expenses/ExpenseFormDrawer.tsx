"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Icons from "lucide-react";
import { Category, Expense } from "@/hooks/use-expenses";

interface ExpenseFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  expense?: Expense | null;
  onSubmit: (data: {
    amount: number;
    merchant: string;
    payment_method: string;
    date: string;
    category_id?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  loading: boolean;
}

export default function ExpenseFormDrawer({
  isOpen,
  onClose,
  categories,
  expense,
  onSubmit,
  loading,
}: ExpenseFormDrawerProps) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Set default values or load selected expense data on open
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (expense) {
        setAmount(expense.amount.toString());
        setMerchant(expense.merchant);
        setPaymentMethod(expense.payment_method);
        setDate(expense.date);
        setCategoryId(expense.category_id || "");
        setNotes(expense.notes || "");
      } else {
        setAmount("");
        setMerchant("");
        setPaymentMethod("card");
        setDate(new Date().toISOString().split("T")[0]); // today's date
        // default to 'Others' or first category
        const others = categories.find((c) => c.name === "Others");
        setCategoryId(others?.id || categories[0]?.id || "");
        setNotes("");
      }
    }
  }, [isOpen, expense, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("Please enter a valid, positive amount.");
      return;
    }

    if (!merchant.trim()) {
      setFormError("Please enter a merchant name.");
      return;
    }

    if (!date) {
      setFormError("Please select a date.");
      return;
    }

    try {
      await onSubmit({
        amount: numericAmount,
        merchant: merchant.trim(),
        payment_method: paymentMethod,
        date,
        category_id: categoryId || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-40 cursor-pointer"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-100">
                  {expense ? "Edit Transaction" : "Add Expense"}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {expense ? "Modify transaction properties" : "Record a new cash, card, or digital expense"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                title="Close"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-400 text-sm">
                  {formError}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Amount (₹)
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

              {/* Merchant */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Merchant / Payee
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition"
                  placeholder="e.g. Starbucks, Amazon, Gas Station"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-3 py-3 text-sm text-neutral-300 outline-none transition cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-3 py-3 text-sm text-neutral-300 outline-none transition cursor-pointer"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="wallet">Wallet</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Transaction Date
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
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-24 bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition resize-none"
                  placeholder="Add details, bill splits, or descriptions (optional)..."
                />
              </div>
            </form>

            {/* Actions Footer */}
            <div className="p-6 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-sm font-semibold text-neutral-400 hover:text-neutral-200 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-sm font-semibold text-neutral-50 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20 cursor-pointer flex items-center gap-1.5"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {expense ? "Save Changes" : "Record Expense"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
