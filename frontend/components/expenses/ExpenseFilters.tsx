"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { Category } from "@/hooks/use-expenses";
import { dbDateToInputDate, inputDateToDbDate } from "@/lib/utils";

interface ExpenseFiltersProps {
  categories: Category[];
  search: string;
  onSearchChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (val: string) => void;
  from: string;
  onFromChange: (val: string) => void;
  to: string;
  onToChange: (val: string) => void;
  sort: string;
  onSortChange: (val: string) => void;
  onClear: () => void;
}

export default function ExpenseFilters({
  categories,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  paymentMethod,
  onPaymentMethodChange,
  from,
  onFromChange,
  to,
  onToChange,
  sort,
  onSortChange,
  onClear,
}: ExpenseFiltersProps) {
  const hasActiveFilters =
    search || category || paymentMethod || from || to || sort !== "date:desc";

  // Local state for text input values
  const [localFrom, setLocalFrom] = useState("");
  const [localTo, setLocalTo] = useState("");

  // Sync with parent props when they are changed/cleared
  useEffect(() => {
    setLocalFrom(dbDateToInputDate(from));
  }, [from]);

  useEffect(() => {
    setLocalTo(dbDateToInputDate(to));
  }, [to]);

  const handleFromTextChange = (val: string) => {
    setLocalFrom(val);
    if (!val.trim()) {
      onFromChange("");
      return;
    }
    const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      onFromChange(inputDateToDbDate(val));
    }
  };

  const handleToTextChange = (val: string) => {
    setLocalTo(val);
    if (!val.trim()) {
      onToChange("");
      return;
    }
    const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      onToChange(inputDateToDbDate(val));
    }
  };

  return (
    <div className="bg-neutral-900/20 border border-neutral-800/60 p-5 rounded-2xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Icons.Search className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-[42px] bg-neutral-950/60 border border-neutral-800/80 focus:border-violet-500 rounded-xl pl-9 pr-4 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition"
            placeholder="Search merchant or notes..."
          />
        </div>

        {/* Category */}
        <div>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full h-[42px] bg-neutral-950/60 border border-neutral-800/80 focus:border-violet-500 rounded-xl px-3.5 text-sm text-neutral-300 outline-none transition cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className="w-full h-[42px] bg-neutral-950/60 border border-neutral-800/80 focus:border-violet-500 rounded-xl px-3.5 text-sm text-neutral-300 outline-none transition cursor-pointer"
          >
            <option value="">All Payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="netbanking">Net Banking</option>
            <option value="wallet">Wallet</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Sorting */}
        <div>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full h-[42px] bg-neutral-950/60 border border-neutral-800/80 focus:border-violet-500 rounded-xl px-3.5 text-sm text-neutral-300 outline-none transition cursor-pointer"
          >
            <option value="date:desc">Newest First</option>
            <option value="date:asc">Oldest First</option>
            <option value="amount:desc">Highest Amount</option>
            <option value="amount:asc">Lowest Amount</option>
            <option value="merchant:asc">Merchant (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Date Range & Clear */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-neutral-800/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              value={localFrom}
              onChange={(e) => handleFromTextChange(e.target.value)}
              className="w-full bg-neutral-950/60 border border-neutral-800/80 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-600 outline-none transition"
              placeholder="DD/MM/YYYY"
              title="From Date"
            />
          </div>
          <span className="text-neutral-500 text-xs">to</span>
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              value={localTo}
              onChange={(e) => handleToTextChange(e.target.value)}
              className="w-full bg-neutral-950/60 border border-neutral-800/80 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-600 outline-none transition"
              placeholder="DD/MM/YYYY"
              title="To Date"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition cursor-pointer ml-auto sm:ml-0"
          >
            <Icons.XCircle className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
