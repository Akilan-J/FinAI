"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Icons from "lucide-react";
import { Category } from "@/hooks/use-expenses";
import { useConvertReceipt, Receipt } from "@/hooks/use-receipts";

interface OcrValidationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  receipt: Receipt | null;
  onSuccess: () => void;
}

export default function OcrValidationDrawer({
  isOpen,
  onClose,
  categories,
  receipt,
  onSuccess,
}: OcrValidationDrawerProps) {
  const { convertReceipt, loading } = useConvertReceipt();

  // Form states
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Populate data when receipt is loaded
  useEffect(() => {
    if (isOpen && receipt) {
      setFormError(null);
      const ext = receipt.extracted_json || {};
      setAmount(ext.amount?.toString() || "");
      setMerchant(ext.merchant || "");
      setDate(ext.date || new Date().toISOString().split("T")[0]);
      setNotes(ext.notes || "OCR extracted expense");
      
      // Default category fallback to 'Others' or first category
      const others = categories.find((c) => c.name === "Others");
      setCategoryId(others?.id || categories[0]?.id || "");
    }
  }, [isOpen, receipt, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt) return;
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
      await convertReceipt(receipt.id, {
        amount: numericAmount,
        merchant: merchant.trim(),
        category_id: categoryId,
        date,
        notes: notes.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Failed to convert receipt to expense.");
    }
  };

  const getFullImageUrl = () => {
    if (!receipt) return "";
    if (receipt.image_url.startsWith("http")) return receipt.image_url;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000";
    return `${backendUrl}${receipt.image_url}`;
  };

  return (
    <AnimatePresence>
      {isOpen && receipt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-40 cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-lg bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-100">Review OCR Results</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Validate details extracted by Google Cloud Vision AI before recording the expense
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-400 text-sm">
                  {formError}
                </div>
              )}

              {/* Receipt Preview */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-2">
                  Receipt Document Image
                </label>
                <div className="relative group overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40 p-2 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFullImageUrl()}
                    alt="Receipt source preview"
                    className="max-h-64 object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              </div>

              {/* Form Input Data */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Extracted Amount (₹)
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
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition"
                    placeholder="Merchant header"
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
                    className="w-full h-20 bg-neutral-950/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition resize-none"
                    placeholder="Add notes..."
                  />
                </div>
              </form>
            </div>

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
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-sm font-semibold text-neutral-50 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Save Expense
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
