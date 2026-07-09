"use client";

import React from "react";
import * as Icons from "lucide-react";
import { Expense } from "@/hooks/use-expenses";
import { formatDateToDDMMYYYY } from "@/lib/utils";

export function CategoryIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent className={className} />;
}

interface ExpenseTableProps {
  expenses: Expense[];
  loading: boolean;
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onSelectAllToggle: (allIds: string[]) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onBulkDelete: () => void;
}

export default function ExpenseTable({
  expenses,
  loading,
  selectedIds,
  onSelectToggle,
  onSelectAllToggle,
  onEdit,
  onDelete,
  onBulkDelete,
}: ExpenseTableProps) {
  const allIds = expenses.map((e) => e.id);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 w-full bg-neutral-900/50 border border-neutral-800/60 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-neutral-800/60 rounded-2xl bg-neutral-900/10 p-16 text-center">
        <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-500 mb-4">
          <Icons.Inbox className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-200">No expenses found</h3>
        <p className="text-sm text-neutral-400 mt-1 max-w-sm">
          Start tracking your expenses by clicking the Add Expense button above or uploading a receipt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-violet-950/20 border border-violet-500/30 p-4 rounded-xl">
          <span className="text-xs font-semibold text-violet-400">
            {selectedIds.length} transaction{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-neutral-50 transition cursor-pointer"
          >
            <Icons.Trash className="w-3.5 h-3.5" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto border border-neutral-800/60 rounded-2xl bg-neutral-900/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/40 text-neutral-400 text-xs font-semibold uppercase tracking-wider">
              <th className="py-4 px-5 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={() => onSelectAllToggle(allIds)}
                  className="rounded border-neutral-800 text-violet-600 focus:ring-violet-500 bg-neutral-950 accent-violet-600 cursor-pointer w-4 h-4"
                />
              </th>
              <th className="py-4 px-5">Date</th>
              <th className="py-4 px-5">Merchant</th>
              <th className="py-4 px-5">Category</th>
              <th className="py-4 px-5">Payment</th>
              <th className="py-4 px-5">Notes</th>
              <th className="py-4 px-5 text-right">Amount</th>
              <th className="py-4 px-5 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 text-sm">
            {expenses.map((expense) => {
              const catName = expense.category?.name || "Others";
              const catIcon = expense.category?.icon || "HelpCircle";
              const catColor = expense.category?.color || "#6B7280";

              return (
                <tr
                  key={expense.id}
                  className="hover:bg-neutral-900/30 transition text-neutral-300 group"
                >
                  <td className="py-4 px-5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(expense.id)}
                      onChange={() => onSelectToggle(expense.id)}
                      className="rounded border-neutral-800 text-violet-600 focus:ring-violet-500 bg-neutral-950 accent-violet-600 cursor-pointer w-4 h-4"
                    />
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap text-xs text-neutral-400">
                    {formatDateToDDMMYYYY(expense.date)}
                  </td>
                  <td className="py-4 px-5 font-medium text-neutral-100 max-w-[180px] truncate">
                    {expense.merchant}
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${catColor}15`,
                        color: catColor,
                        border: `1px solid ${catColor}30`,
                      }}
                    >
                      <CategoryIcon name={catIcon} className="w-3.5 h-3.5" />
                      {catName}
                    </span>
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap text-xs capitalize text-neutral-400">
                    {expense.payment_method}
                  </td>
                  <td className="py-4 px-5 max-w-[200px] truncate text-neutral-400">
                    {expense.notes || "—"}
                  </td>
                  <td className="py-4 px-5 text-right font-semibold text-neutral-100 whitespace-nowrap">
                    ₹{Number(expense.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(expense)}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                        title="Edit Transaction"
                      >
                        <Icons.Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-rose-500/80 hover:text-rose-400 transition cursor-pointer"
                        title="Delete Transaction"
                      >
                        <Icons.Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
