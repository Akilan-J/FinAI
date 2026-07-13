"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import {
  useAnalyticsSummary,
  useCategoryDistribution,
  useMonthlyTrends,
} from "@/hooks/use-analytics";
import { formatDateToDDMMYYYY } from "@/lib/utils";

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const { summary, loading: summaryLoading } = useAnalyticsSummary(period);
  const { distribution, loading: distLoading } = useCategoryDistribution(period);
  const { trends, loading: trendsLoading } = useMonthlyTrends(6);

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

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!summary || distribution.length === 0) return;
    const headers = ["Category Name", "Amount (INR)", "Percentage Allocation (%)"];
    const rows = distribution.map((item) => [
      item.category_name,
      item.amount.toFixed(2),
      item.percentage.toFixed(1),
    ]);
    const summaryRows = [
      [],
      ["Report Period", getPeriodLabel()],
      ["Total Income Inflow", summary.total_income.toFixed(2)],
      ["Total Expenses Outflow", summary.total_spent.toFixed(2)],
      ["Net Savings Surplus", summary.net_savings.toFixed(2)],
      ["Savings Rate", `${summary.savings_rate.toFixed(1)}%`],
    ];
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
      ...summaryRows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FinAI_Financial_Report_${period}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 text-neutral-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500 border-r-2 mb-2" />
        <span className="text-xs">Loading report widgets...</span>
      </div>
    );
  }

  const isLoading = summaryLoading || distLoading || trendsLoading;

  return (
    <div className="flex-1 flex flex-col space-y-6 print:p-0 print:space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:border-b print:pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100 print:text-neutral-900">
            Financial Statements
          </h2>
          <p className="text-xs text-neutral-400 mt-1 print:text-neutral-500">
            Export monthly income distributions, net saving ratios, and category allocation structures
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 print:hidden">
          <div className="flex items-center gap-1.5 bg-neutral-900/40 border border-neutral-850 p-1.5 rounded-xl">
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

          <button
            onClick={handleExportCSV}
            disabled={isLoading || !summary}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-sm font-semibold text-neutral-300 transition cursor-pointer"
            title="Download CSV Statement"
          >
            <Icons.Download className="w-4 h-4 text-emerald-400" />
            Download CSV
          </button>

          <button
            onClick={handlePrint}
            disabled={isLoading || !summary}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-neutral-50 shadow-lg shadow-violet-500/25 cursor-pointer transition-all duration-200"
          >
            <Icons.Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-neutral-900/50 border border-neutral-800/60 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-neutral-900/50 border border-neutral-800/60 rounded-2xl" />
            <div className="h-80 bg-neutral-900/50 border border-neutral-800/60 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Print Only Header details */}
          <div className="hidden print:block text-xs text-neutral-600 mb-4">
            <div className="flex justify-between">
              <span><strong>Statement Period:</strong> {getPeriodLabel()}</span>
              <span><strong>Generated Date:</strong> {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Summary Stat Grid */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
              {/* Income */}
              <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl print:bg-white print:border print:text-black">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Inflow</span>
                  <Icons.ArrowUpRight className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-neutral-100 print:text-black">
                  ₹{Number(summary.total_income).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <span className="block text-[10px] text-neutral-500 mt-1">Total income logs registered</span>
              </div>

              {/* Outflow */}
              <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl print:bg-white print:border print:text-black">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Outflow</span>
                  <Icons.ArrowDownRight className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-neutral-100 print:text-black">
                  ₹{Number(summary.total_spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <span className="block text-[10px] text-neutral-500 mt-1">Total expenses outflow</span>
              </div>

              {/* Net Savings */}
              <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl print:bg-white print:border print:text-black">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Net Savings</span>
                  <Icons.TrendingUp className="w-4 h-4 text-violet-500" />
                </div>
                <div className={`mt-2 text-2xl font-black ${Number(summary.net_savings) >= 0 ? "text-emerald-400" : "text-rose-400"} print:text-black`}>
                  ₹{Number(summary.net_savings).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <span className="block text-[10px] text-neutral-500 mt-1">Surplus/deficit margin</span>
              </div>

              {/* Savings Rate */}
              <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl print:bg-white print:border print:text-black">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Savings Rate</span>
                  <Icons.Percent className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-neutral-100 print:text-black">
                  {summary.savings_rate.toFixed(1)}%
                </div>
                <span className="block text-[10px] text-neutral-500 mt-1">Percentage of income saved</span>
              </div>
            </div>
          )}

          {/* Detailed breakdowns rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
            {/* Category breakdown list */}
            <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl print:bg-white print:border print:text-black space-y-4">
              <div>
                <h3 className="font-bold text-neutral-100 print:text-black">Category Allocation Statement</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Detailed distribution of spent allocations across category folders
                </p>
              </div>

              {distribution.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No allocation metrics recorded for this statement period.
                </div>
              ) : (
                <div className="space-y-4">
                  {distribution.map((item) => (
                    <div key={item.category_id || "others"} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-neutral-300 print:text-black">
                        <span className="font-semibold">{item.category_name}</span>
                        <div className="font-bold flex gap-2">
                          <span>₹{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-neutral-500">({item.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-900/60 h-3 rounded-full overflow-hidden print:bg-neutral-200">
                        <div
                          className="h-full rounded-full print:bg-black"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historical monthly statements trend logs */}
            <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl print:bg-white print:border print:text-black space-y-4">
              <div>
                <h3 className="font-bold text-neutral-100 print:text-black">Historical Surplus Ledger</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Statement analysis showing positive surplus or deficit balances over past periods
                </p>
              </div>

              {trends.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No cash flow trends detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {trends.map((t) => {
                    const surplus = Number(t.total_income) - Number(t.total_spent);
                    const [yr, mn] = t.period.split("-");
                    const label = new Date(Number(yr), Number(mn) - 1, 1).toLocaleDateString(
                      undefined,
                      { month: "long", year: "numeric" }
                    );

                    return (
                      <div key={t.period} className="bg-neutral-950/40 border border-neutral-900/60 p-3.5 rounded-xl flex items-center justify-between print:border print:bg-white">
                        <div>
                          <span className="block font-bold text-neutral-200 text-xs print:text-black">{label}</span>
                          <span className="text-[10px] text-neutral-500">
                            Inflow: ₹{Number(t.total_income).toLocaleString()} | Outflow: ₹{Number(t.total_spent).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`block font-black text-xs ${surplus >= 0 ? "text-emerald-400" : "text-rose-400"} print:text-black`}>
                            {surplus >= 0 ? "+" : ""}₹{surplus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold mt-1 ${surplus >= 0 ? "bg-emerald-950/20 text-emerald-400" : "bg-rose-950/20 text-rose-400"} print:border`}>
                            {surplus >= 0 ? "Surplus" : "Deficit"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
