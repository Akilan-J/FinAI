"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  useAnalyticsSummary,
  useCategoryDistribution,
  useMonthlyTrends,
} from "@/hooks/use-analytics";
import { useExpenses } from "@/hooks/use-expenses";
import { CategoryIcon } from "@/components/expenses/ExpenseTable";
import { formatDateToDDMMYYYY } from "@/lib/utils";
import { useGoals, useGoalMutations } from "@/hooks/use-goals";
import { useRecurringBills, useRecurringMutations } from "@/hooks/use-recurring";
import { useBudgets } from "@/hooks/use-budgets";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  // Client mounting check to prevent Recharts hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch summaries, distributions, trends, and recent expenses
  const { summary, loading: summaryLoading } = useAnalyticsSummary(period);
  const { distribution, loading: distLoading } = useCategoryDistribution(period);
  const { trends, loading: trendsLoading } = useMonthlyTrends(6);
  const { expenses, loading: expensesLoading } = useExpenses({ limit: 5 });

  // Budgets list
  const { budgets, loading: budgetsLoading } = useBudgets(period);
  const [budgetThreshold, setBudgetThreshold] = useState(90);

  useEffect(() => {
    const storedThreshold = localStorage.getItem("budget_alert_threshold");
    if (storedThreshold) {
      setBudgetThreshold(Number(storedThreshold));
    }
  }, []);

  // Goals and Recurring Bills
  const { goals, loading: goalsLoading, refetch: refetchGoals } = useGoals();
  const { bills, loading: billsLoading, refetch: refetchBills } = useRecurringBills();

  const { createGoal, updateGoal, deleteGoal } = useGoalMutations();
  const { createBill, deleteBill } = useRecurringMutations();

  // Dialog State: Goals Add Form
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDate, setNewGoalDate] = useState("");

  // Dialog State: Goals Progress Update
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalProgressAmount, setGoalProgressAmount] = useState("");

  // Dialog State: Bills Add Form
  const [showAddBill, setShowAddBill] = useState(false);
  const [newBillName, setNewBillName] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [newBillCategory, setNewBillCategory] = useState("Subscription");
  const [newBillFrequency, setNewBillFrequency] = useState("monthly");
  const [newBillDueDate, setNewBillDueDate] = useState("");

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

  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 text-neutral-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500 border-r-2 mb-2" />
        <span className="text-xs">Loading analytics widgets...</span>
      </div>
    );
  }

  const isLoading = summaryLoading || distLoading || trendsLoading || expensesLoading || goalsLoading || billsLoading || budgetsLoading;

  // Prepare chart format
  const chartData = distribution.map((item) => ({
    name: item.category_name,
    value: Number(item.amount),
    color: item.color,
  }));

  const trendData = trends.map((t) => {
    const [year, month] = t.period.split("-");
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
      undefined,
      { month: "short" }
    );
    return {
      period: label,
      Inflow: Number(t.total_income),
      Outflow: Number(t.total_spent),
    };
  });

  // Submit handlers for Goals
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newGoalTarget || !newGoalDate) return;
    try {
      const parts = newGoalDate.split("/");
      const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
      await createGoal({
        name: newGoalName,
        target_amount: parseFloat(newGoalTarget),
        target_date: formattedDate,
      });
      setNewGoalName("");
      setNewGoalTarget("");
      setNewGoalDate("");
      setShowAddGoal(false);
      refetchGoals();
    } catch (err) {
      alert("Failed to create savings goal. Verify the date format DD/MM/YYYY.");
    }
  };

  const handleUpdateGoalProgress = async (id: string, currentSaved: number) => {
    if (!goalProgressAmount) return;
    try {
      const added = parseFloat(goalProgressAmount);
      await updateGoal(id, {
        current_amount: currentSaved + added,
      });
      setEditingGoalId(null);
      setGoalProgressAmount("");
      refetchGoals();
    } catch (err) {
      alert("Failed to update goal progress.");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this savings goal?")) return;
    try {
      await deleteGoal(id);
      refetchGoals();
    } catch (err) {
      alert("Failed to delete savings goal.");
    }
  };

  // Submit handlers for Recurring Bills
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillName.trim() || !newBillAmount || !newBillDueDate) return;
    try {
      const parts = newBillDueDate.split("/");
      const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
      await createBill({
        name: newBillName,
        amount: parseFloat(newBillAmount),
        category: newBillCategory,
        frequency: newBillFrequency,
        next_due_date: formattedDate,
      });
      setNewBillName("");
      setNewBillAmount("");
      setNewBillDueDate("");
      setShowAddBill(false);
      refetchBills();
    } catch (err) {
      alert("Failed to create subscription bill. Verify the date format DD/MM/YYYY.");
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm("Are you sure you want to remove this subscription recurring bill?")) return;
    try {
      await deleteBill(id);
      refetchBills();
    } catch (err) {
      alert("Failed to remove recurring bill.");
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            Financial Insights
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Analyze your income vs. spent ratios, category shares, and monthly trends
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2.5 bg-neutral-900/40 border border-neutral-850 p-2 rounded-xl">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 transition cursor-pointer"
          >
            <Icons.ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-neutral-200 min-w-[100px] text-center">
            {getPeriodLabel()}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 transition cursor-pointer"
          >
            <Icons.ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-neutral-900/50 border border-neutral-800/60 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-80 lg:col-span-2 bg-neutral-900/50 border border-neutral-800/60 rounded-2xl" />
            <div className="h-80 bg-neutral-900/50 border border-neutral-800/60 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stat Widgets */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Income */}
              <div className="bg-neutral-900/25 border border-neutral-800/60 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Total Income
                  </span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    <Icons.TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-neutral-100">
                    ₹{Number(summary.total_income).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[10px] text-neutral-500 mt-1">
                    Monthly deposits received
                  </span>
                </div>
              </div>

              {/* Expenses */}
              <div className="bg-neutral-900/25 border border-neutral-800/60 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-rose-500/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Total Expenses
                  </span>
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                    <Icons.TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-neutral-100">
                    ₹{Number(summary.total_spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[10px] text-neutral-500 mt-1">
                    Category outflow logs
                  </span>
                </div>
              </div>

              {/* Net Savings */}
              <div className="bg-neutral-900/25 border border-neutral-800/60 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-violet-500/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Net Savings
                  </span>
                  <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">
                    <Icons.Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`text-2xl font-bold ${Number(summary.net_savings) >= 0 ? "text-neutral-100" : "text-rose-400"}`}>
                    {Number(summary.net_savings) >= 0 ? "" : "-"}₹{Math.abs(Number(summary.net_savings)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[10px] text-neutral-500 mt-1">
                    Retained inflow balance
                  </span>
                </div>
              </div>

              {/* Savings Rate */}
              <div className="bg-neutral-900/25 border border-neutral-800/60 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Savings Rate
                  </span>
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                    <Icons.Percent className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-neutral-100">
                    {summary.savings_rate.toFixed(1)}%
                  </span>
                  <span className="block text-[10px] text-neutral-500 mt-1">
                    Percent of income saved
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Budget Health Warning banner */}
          {summary && summary.over_budget_count > 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-950/20 border border-amber-800/30 rounded-2xl text-amber-400 text-sm">
              <Icons.AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-bold">Budget Warning!</span> You have exceeded monthly limit allocations in <span className="font-bold">{summary.over_budget_count} categories</span> for {getPeriodLabel()}. Check your budgets page to adjust limits.
              </div>
              <Link
                href="/budgets"
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl cursor-pointer transition-all duration-200"
              >
                Manage
              </Link>
            </div>
          )}

          {/* Dynamic Budget Alert Warning threshold banner */}
          {budgets && budgets.some(b => b.progress.percentage_used >= budgetThreshold && b.progress.percentage_used < 100) && (
            <div className="flex flex-col gap-2.5 p-4 bg-orange-950/20 border border-orange-800/30 rounded-2xl text-orange-400 text-sm">
              <div className="flex items-center gap-3">
                <Icons.AlertOctagon className="w-5 h-5 flex-shrink-0" />
                <div>
                  <span className="font-bold">Budget Warning!</span> The following categories have exceeded your custom <span className="font-bold">{budgetThreshold}% warning limit</span>:
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-8">
                {budgets
                  .filter(b => b.progress.percentage_used >= budgetThreshold && b.progress.percentage_used < 100)
                  .map(b => (
                    <div key={b.id} className="text-xs text-orange-300/90 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span>{b.category?.name || "Uncategorized"}: <strong>{b.progress.percentage_used.toFixed(0)}% used</strong> (₹{Math.round(b.spent)} / ₹{Math.round(b.amount_limit)})</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Main Analytics Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Income vs Expenses Bar Chart */}
            <div className="lg:col-span-2 bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="font-bold text-neutral-100">Monthly Cash Flow</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Compare historical inflows and outflows over the past 6 periods
                  </p>
                </div>
              </div>
              <div className="h-64 w-full text-xs">
                {trendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-neutral-500">
                    No trend metrics recorded yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="period" stroke="#737373" />
                      <YAxis stroke="#737373" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", borderRadius: "12px" }}
                        labelStyle={{ fontWeight: "bold", color: "#F5F5F5" }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Outflow" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category Allocation Pie Chart */}
            <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="font-bold text-neutral-100">Category Allocation</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Distribution of spent totals by category groups
                  </p>
                </div>
              </div>
              <div className="h-56 w-full text-xs relative flex items-center justify-center">
                {chartData.length === 0 ? (
                  <div className="text-neutral-500">No transactions recorded for this period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", borderRadius: "12px" }}
                        itemStyle={{ color: "#F5F5F5" }}
                      />
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {chartData.length > 0 && (
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                      Total Spent
                    </span>
                    <span className="text-sm font-black text-neutral-100">
                      ₹{summary ? Math.round(Number(summary.total_spent)).toLocaleString() : "0"}
                    </span>
                  </div>
                )}
              </div>
              {/* Pie Legends list */}
              {chartData.length > 0 && (
                <div className="flex-1 overflow-y-auto max-h-32 divide-y divide-neutral-900 text-xs">
                  {distribution.slice(0, 3).map((item) => (
                    <div key={item.category_id || "others"} className="flex items-center justify-between py-2 text-neutral-300">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold truncate">{item.category_name}</span>
                      </div>
                      <span className="font-bold text-neutral-200">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Savings Goals & Recurring Subscriptions row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Savings Goals Planner */}
            <div className="lg:col-span-2 bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="font-bold text-neutral-100">Savings Goals</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Track savings targets and fund allocations for key plans
                  </p>
                </div>
                <button
                  onClick={() => setShowAddGoal(!showAddGoal)}
                  className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300 transition cursor-pointer"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  Add Goal
                </button>
              </div>

              {/* Add Goal Form Inline Overlay */}
              {showAddGoal && (
                <form onSubmit={handleCreateGoal} className="bg-neutral-950/60 border border-neutral-850 p-4 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Goal Name (e.g., Mac Studio)"
                      value={newGoalName}
                      onChange={(e) => setNewGoalName(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-neutral-100 outline-none"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Target Amount (₹)"
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-neutral-100 outline-none"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Target Date (DD/MM/YYYY)"
                      value={newGoalDate}
                      onChange={(e) => setNewGoalDate(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-neutral-100 outline-none"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowAddGoal(false)}
                      className="px-3 py-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-400 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-neutral-50 rounded-lg transition"
                    >
                      Save Goal
                    </button>
                  </div>
                </form>
              )}

              {goals.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No savings goals defined. Create one to start tracking.
                </div>
              ) : (
                <div className="space-y-4 max-h-[22rem] overflow-y-auto pr-1">
                  {goals.map((goal) => {
                    const percent = Math.min(100, Math.max(0, (goal.current_amount / goal.target_amount) * 100));
                    return (
                      <div key={goal.id} className="bg-neutral-950/30 border border-neutral-900 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-neutral-200">{goal.name}</span>
                            <span className="text-[10px] text-neutral-500 ml-2">Target: {formatDateToDDMMYYYY(goal.target_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-neutral-300">
                              ₹{Number(goal.current_amount).toLocaleString()} / ₹{Number(goal.target_amount).toLocaleString()}
                            </span>
                            <span className="font-bold text-violet-400">({percent.toFixed(0)}%)</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-neutral-900/60 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-350"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Inline progress addition */}
                        <div className="flex items-center justify-between pt-1">
                          {editingGoalId === goal.id ? (
                            <div className="flex items-center gap-2 w-full max-w-[240px]">
                              <input
                                type="number"
                                placeholder="Add Amount (₹)"
                                value={goalProgressAmount}
                                onChange={(e) => setGoalProgressAmount(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-lg px-2 py-1 text-[10px] text-neutral-100 outline-none"
                              />
                              <button
                                onClick={() => handleUpdateGoalProgress(goal.id, goal.current_amount)}
                                className="px-2.5 py-1 bg-violet-600 hover:bg-violet-550 text-neutral-50 rounded-lg text-[9px] font-bold transition"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingGoalId(null)}
                                className="text-neutral-500 hover:text-neutral-300 text-[10px] px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingGoalId(goal.id);
                                setGoalProgressAmount("");
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                            >
                              <Icons.Coins className="w-3.5 h-3.5 text-violet-400" />
                              Add Savings
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-neutral-600 hover:text-red-400 transition"
                            title="Delete goal"
                          >
                            <Icons.Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recurring Subscriptions & Bills */}
            <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="font-bold text-neutral-100">Recurring Bills</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Forecast upcoming active monthly subscriptions
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBill(!showAddBill)}
                  className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300 transition cursor-pointer"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  Add Bill
                </button>
              </div>

              {/* Add Bill Form Inline Overlay */}
              {showAddBill && (
                <form onSubmit={handleCreateBill} className="bg-neutral-950/60 border border-neutral-850 p-4 rounded-xl space-y-3 text-xs">
                  <input
                    type="text"
                    placeholder="Subscription Name (Netflix)"
                    value={newBillName}
                    onChange={(e) => setNewBillName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-1.5 text-neutral-100 outline-none"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount (₹)"
                      value={newBillAmount}
                      onChange={(e) => setNewBillAmount(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-1.5 text-neutral-100 outline-none"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Due Date (DD/MM/YYYY)"
                      value={newBillDueDate}
                      onChange={(e) => setNewBillDueDate(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-1.5 text-neutral-100 outline-none"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBill(false)}
                      className="px-3 py-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-400 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-neutral-50 rounded-lg transition"
                    >
                      Save Bill
                    </button>
                  </div>
                </form>
              )}

              {bills.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No recurring bills found. Add subscriptions to forecast.
                </div>
              ) : (
                <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
                  {bills.map((bill) => {
                    const due = new Date(bill.next_due_date);
                    const diffDays = Math.ceil((due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    let badgeColor = "bg-neutral-900 text-neutral-400";
                    let badgeText = `In ${diffDays} days`;
                    if (diffDays <= 0) {
                      badgeColor = "bg-rose-950/20 border border-rose-800/30 text-rose-400";
                      badgeText = "Due Today";
                    } else if (diffDays <= 3) {
                      badgeColor = "bg-amber-950/20 border border-amber-800/30 text-amber-400";
                      badgeText = `Due in ${diffDays}d`;
                    }

                    return (
                      <div key={bill.id} className="bg-neutral-950/30 border border-neutral-900 p-3 rounded-xl flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-neutral-200 text-xs">{bill.name}</span>
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-neutral-500 px-1.5 py-0.5 bg-neutral-900 rounded-full border border-neutral-800">
                              {bill.category}
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            Next due: {formatDateToDDMMYYYY(bill.next_due_date)} ({bill.frequency})
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="block font-black text-xs text-neutral-300">₹{Number(bill.amount).toLocaleString()}</span>
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold mt-1 ${badgeColor}`}>
                              {badgeText}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteBill(bill.id)}
                            className="text-neutral-700 hover:text-red-400 transition"
                            title="Remove recurring bill"
                          >
                            <Icons.Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Expenses List Shortcut */}
          <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-neutral-100">Recent Transactions</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Latest cash, credit card, and digital expense entries
                </p>
              </div>
              <Link
                href="/expenses"
                className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300 transition cursor-pointer"
              >
                View History
                <Icons.ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {expenses.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                No recent transactions found. Add a transaction in the expenses tab.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-900 text-neutral-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3">Merchant</th>
                      <th className="pb-3 px-3">Category</th>
                      <th className="pb-3 px-3">Payment</th>
                      <th className="pb-3 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60 text-neutral-300">
                    {expenses.map((expense) => {
                      const catName = expense.category?.name || "Others";
                      const catIcon = expense.category?.icon || "HelpCircle";
                      const catColor = expense.category?.color || "#6B7280";

                      return (
                        <tr key={expense.id} className="hover:bg-neutral-900/20 transition">
                          <td className="py-3 px-3 text-neutral-400 whitespace-nowrap">
                            {formatDateToDDMMYYYY(expense.date)}
                          </td>
                          <td className="py-3 px-3 font-semibold text-neutral-200">
                            {expense.merchant}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${catColor}15`,
                                color: catColor,
                                border: `1px solid ${catColor}30`,
                              }}
                            >
                              <CategoryIcon name={catIcon} className="w-3 h-3" />
                              {catName}
                            </span>
                          </td>
                          <td className="py-3 px-3 capitalize text-neutral-400">{expense.payment_method}</td>
                          <td className="py-3 px-3 text-right font-bold text-neutral-200">
                            ₹{Number(expense.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
