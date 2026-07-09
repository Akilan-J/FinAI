"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { useCategories } from "@/hooks/use-expenses";
import { useBudgets, useBudgetMutations, Budget } from "@/hooks/use-budgets";
import { CategoryIcon } from "@/components/expenses/ExpenseTable";
import ConfirmModal from "@/components/ConfirmModal";

export default function BudgetsPage() {
  const { categories } = useCategories();

  // Current period (defaulting to current month in YYYY-MM format)
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  // Query budgets
  const { budgets, loading, refetch } = useBudgets(period);
  const { createBudget, updateBudget, deleteBudget, loading: mutationLoading } = useBudgetMutations();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);

  // Form states
  const [categoryId, setCategoryId] = useState("");
  const [amountLimit, setAmountLimit] = useState("");
  const [alertPct, setAlertPct] = useState("80");
  const [formError, setFormError] = useState<string | null>(null);

  // Load active budget details on edit mode
  useEffect(() => {
    if (activeBudget) {
      setCategoryId(activeBudget.category_id);
      setAmountLimit(activeBudget.amount_limit.toString());
      setAlertPct(Math.round(activeBudget.alert_pct * 100).toString());
    } else {
      setCategoryId(categories[0]?.id || "");
      setAmountLimit("");
      setAlertPct("80");
    }
    setFormError(null);
  }, [activeBudget, isModalOpen, categories]);

  const handleOpenAddModal = () => {
    setActiveBudget(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (budget: Budget) => {
    setActiveBudget(budget);
    setIsModalOpen(true);
  };

  // Confirm modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteBudget = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDeleteBudget = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    try {
      await deleteBudget(confirmDeleteId);
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to delete budget");
    } finally {
      setDeleteLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const limitVal = parseFloat(amountLimit);
    if (isNaN(limitVal) || limitVal <= 0) {
      setFormError("Please enter a valid monthly amount limit.");
      return;
    }

    const pctVal = parseFloat(alertPct);
    if (isNaN(pctVal) || pctVal < 0 || pctVal > 100) {
      setFormError("Alert threshold must be a percentage between 0% and 100%.");
      return;
    }

    try {
      if (activeBudget) {
        // Edit mode
        await updateBudget(activeBudget.id, {
          amount_limit: limitVal,
          alert_pct: pctVal / 100,
        });
      } else {
        // Create mode
        await createBudget({
          category_id: categoryId,
          amount_limit: limitVal,
          period,
          alert_pct: pctVal / 100,
        });
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Error submitting budget details. Check duplicate category constraints.");
    }
  };

  // Quick period navigation
  const handlePrevMonth = () => {
    const [y, m] = period.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, "0");
    setPeriod(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = period.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, "0");
    setPeriod(`${newY}-${newM}`);
  };

  const getPeriodLabel = () => {
    const [y, m] = period.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            Category Budgets
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Establish spending caps per category and receive alert threshold warnings
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-neutral-50 shadow-lg shadow-violet-500/25 cursor-pointer transition-all duration-200"
        >
          <Icons.Plus className="w-4 h-4" />
          Create Budget
        </button>
      </div>

      {/* Period Selector Controls */}
      <div className="flex items-center justify-between bg-neutral-900/20 border border-neutral-800/60 p-4 rounded-xl">
        <span className="text-xs text-neutral-400 font-medium">Selected Period</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            title="Previous Month"
          >
            <Icons.ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-neutral-200 min-w-[120px] text-center">
            {getPeriodLabel()}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            title="Next Month"
          >
            <Icons.ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Budgets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-48 w-full bg-neutral-900/50 border border-neutral-800/60 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-neutral-800/60 rounded-2xl bg-neutral-900/10 p-16 text-center">
          <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-500 mb-4">
            <Icons.Target className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-200">No budgets established</h3>
          <p className="text-sm text-neutral-400 mt-1 max-w-sm">
            Create monthly spending limits to prevent budget overages and gain category insights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const spent = Number(budget.spent);
            const limit = Number(budget.amount_limit);
            const ratio = limit > 0 ? spent / limit : 0;
            const pct = Math.min(100, Math.round(ratio * 100));

            // Colors based on alert threshold ratios
            let progressColor = "bg-emerald-500 shadow-emerald-500/20";
            let textColor = "text-emerald-400";
            let borderColor = "border-neutral-800/60 hover:border-emerald-500/30";
            let bgColor = "bg-neutral-900/25";

            if (ratio >= 1.0) {
              progressColor = "bg-rose-500 shadow-rose-500/20";
              textColor = "text-rose-400";
              borderColor = "border-rose-900/50 hover:border-rose-500/30";
              bgColor = "bg-rose-950/5";
            } else if (ratio >= budget.alert_pct) {
              progressColor = "bg-amber-500 shadow-amber-500/20";
              textColor = "text-amber-400";
              borderColor = "border-amber-900/50 hover:border-amber-500/30";
              bgColor = "bg-amber-950/5";
            }

            return (
              <div
                key={budget.id}
                className={`border ${borderColor} ${bgColor} rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300`}
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl flex items-center justify-center border"
                      style={{
                        backgroundColor: `${budget.category.color}15`,
                        color: budget.category.color,
                        borderColor: `${budget.category.color}30`,
                      }}
                    >
                      <CategoryIcon name={budget.category.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-100">{budget.category.name}</h4>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500">
                        {budget.period}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(budget)}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
                      title="Edit Budget"
                    >
                      <Icons.Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="p-1 rounded hover:bg-neutral-800 text-rose-500/60 hover:text-rose-400 transition cursor-pointer"
                      title="Delete Budget"
                    >
                      <Icons.Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-2 mt-6">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-neutral-400 font-medium">Spent</span>
                    <span className="text-neutral-100 font-bold">
                      ₹{spent.toLocaleString()} / <span className="text-neutral-400 font-normal">₹{limit.toLocaleString()}</span>
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-900">
                    <div
                      className={`h-full rounded-full transition-all duration-500 shadow-sm ${progressColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <span className={`font-semibold ${textColor}`}>{pct}% used</span>
                    <span className="text-neutral-500">
                      Alerts at {Math.round(budget.alert_pct * 100)}%
                    </span>
                  </div>
                </div>

                {/* Over Limit Alerts */}
                {ratio >= 1.0 ? (
                  <div className="flex items-center gap-1.5 mt-4 p-2.5 rounded-lg bg-rose-950/20 border border-rose-800/30 text-[10px] text-rose-400 font-medium">
                    <Icons.AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Budget limit exceeded by ₹{(spent - limit).toLocaleString()}!
                  </div>
                ) : ratio >= budget.alert_pct ? (
                  <div className="flex items-center gap-1.5 mt-4 p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/30 text-[10px] text-amber-400 font-medium">
                    <Icons.AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Approaching spending threshold warning!
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal box */}
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 z-10 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-neutral-100">
                {activeBudget ? "Edit Category Budget" : "Create Budget"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/50 text-rose-400 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              {/* Category selector */}
              {!activeBudget && (
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-1.5">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl px-3 py-2.5 text-sm text-neutral-300 outline-none transition cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Limit */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-1.5">
                  Amount Limit (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={amountLimit}
                  onChange={(e) => setAmountLimit(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-700 outline-none transition"
                  placeholder="e.g. 5000"
                  required
                />
              </div>

              {/* Threshold alerts slider */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    Warning Threshold
                  </label>
                  <span className="text-xs font-bold text-violet-400">{alertPct}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={alertPct}
                  onChange={(e) => setAlertPct(e.target.value)}
                  className="w-full h-1.5 bg-neutral-950 border border-neutral-900 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                <span className="block text-[9px] text-neutral-500 mt-1">
                  Triggers warnings once expenditures reach {alertPct}% of limits.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-800 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutationLoading}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-semibold text-neutral-50 rounded-xl transition cursor-pointer"
                >
                  {mutationLoading ? "Submitting..." : activeBudget ? "Save Limit" : "Create Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Budget"
        message="This budget limit will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={executeDeleteBudget}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
