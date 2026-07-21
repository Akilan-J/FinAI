"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { useLoans, useLoanMutations, Loan } from "@/hooks/use-loans";
import { formatDateToDDMMYYYY } from "@/lib/utils";

export default function LoansPage() {
  const [mounted, setMounted] = useState(false);
  const { loans, loading, error, refetch } = useLoans();
  const { createLoan, updateLoan, deleteLoan } = useLoanMutations();

  // Filter Tab State
  const [filterTab, setFilterTab] = useState<"all" | "lent" | "borrowed" | "pending" | "settled">("all");

  // Add Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [loanType, setLoanType] = useState<"lent" | "borrowed">("lent");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Payment update states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  // Edit Record States
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [editFriendName, setEditFriendName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editType, setEditType] = useState<"lent" | "borrowed">("lent");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStartEdit = (loan: Loan) => {
    setEditRecordId(loan.id);
    setEditFriendName(loan.friend_name);
    setEditAmount(String(loan.amount));
    setEditType(loan.type);
    if (loan.due_date) {
      const parts = loan.due_date.split("-");
      if (parts.length === 3) {
        setEditDueDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
      } else {
        setEditDueDate("");
      }
    } else {
      setEditDueDate("");
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editFriendName.trim() || !editAmount) return;

    try {
      let formattedDate: string | null = null;
      if (editDueDate.trim()) {
        const parts = editDueDate.split("/");
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
      }

      await updateLoan(id, {
        friend_name: editFriendName,
        type: editType,
        amount: parseFloat(editAmount),
        due_date: formattedDate,
      });

      setEditRecordId(null);
      refetch();
    } catch (err) {
      alert("Failed to update record. Check if date format matches DD/MM/YYYY.");
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 text-neutral-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500 border-r-2 mb-2" />
        <span className="text-xs font-semibold">Loading accounting balances...</span>
      </div>
    );
  }

  // Action Handlers
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim() || !amount) return;

    try {
      let formattedDate: string | null = null;
      if (dueDate.trim()) {
        const parts = dueDate.split("/");
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
      }

      await createLoan({
        friend_name: friendName,
        type: loanType,
        amount: parseFloat(amount),
        due_date: formattedDate,
      });

      setFriendName("");
      setAmount("");
      setDueDate("");
      setShowAddForm(false);
      refetch();
    } catch (err) {
      alert("Failed to record debt. Check if date format matches DD/MM/YYYY.");
    }
  };

  const handleAddPayment = async (loan: Loan) => {
    if (!paymentAmount) return;
    try {
      const added = parseFloat(paymentAmount);
      const newPaid = Number(loan.paid_amount) + added;
      const isSettled = newPaid >= Number(loan.amount);

      await updateLoan(loan.id, {
        paid_amount: newPaid,
        status: isSettled ? "settled" : "pending",
      });

      setEditingLoanId(null);
      setPaymentAmount("");
      refetch();
    } catch (err) {
      alert("Failed to update repayment progress.");
    }
  };

  const handleSettleFull = async (loan: Loan) => {
    if (!confirm(`Settle full outstanding debt for ${loan.friend_name}?`)) return;
    try {
      await updateLoan(loan.id, {
        paid_amount: loan.amount,
        status: "settled",
      });
      refetch();
    } catch (err) {
      alert("Failed to settle debt.");
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm("Are you sure you want to remove this debt record?")) return;
    try {
      await deleteLoan(id);
      refetch();
    } catch (err) {
      alert("Failed to delete loan entry.");
    }
  };

  // Summaries Calculations
  const pendingLoans = loans.filter((l) => l.status === "pending");
  const totalLent = pendingLoans
    .filter((l) => l.type === "lent")
    .reduce((sum, l) => sum + (Number(l.amount) - Number(l.paid_amount)), 0);
  const totalBorrowed = pendingLoans
    .filter((l) => l.type === "borrowed")
    .reduce((sum, l) => sum + (Number(l.amount) - Number(l.paid_amount)), 0);
  const netBalance = totalLent - totalBorrowed;

  // Filter application
  const filteredLoans = loans.filter((loan) => {
    if (filterTab === "lent") return loan.type === "lent";
    if (filterTab === "borrowed") return loan.type === "borrowed";
    if (filterTab === "pending") return loan.status === "pending";
    if (filterTab === "settled") return loan.status === "settled";
    return true;
  });

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            Lends & Loans (Accounting)
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Track money lent to friends or borrowed from others, manage partial repayments, and log balances
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-neutral-50 rounded-xl cursor-pointer shadow-lg shadow-violet-500/25 transition-all duration-200"
        >
          <Icons.Plus className="w-4 h-4" />
          Add Debt Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Money Owed to Us */}
        <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Owed to Me (Lent)</span>
            <Icons.ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            ₹{totalLent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="block text-[10px] text-neutral-500 mt-1">Outstanding lent balance</span>
        </div>

        {/* Money We Owe */}
        <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">I Owe (Borrowed)</span>
            <Icons.ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400">
            ₹{totalBorrowed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="block text-[10px] text-neutral-500 mt-1">Outstanding debts to others</span>
        </div>

        {/* Net Debt Position */}
        <div className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Net Position</span>
            <Icons.TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <div className={`mt-2 text-2xl font-black ${netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {netBalance >= 0 ? "+" : ""}₹{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="block text-[10px] text-neutral-500 mt-1">Net financial surplus/deficit</span>
        </div>
      </div>

      {/* Add Form Overlay */}
      {showAddForm && (
        <form onSubmit={handleCreateLoan} className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-neutral-200">Record New Loan / Debt</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Friend's Name"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
              required
            />
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value as "lent" | "borrowed")}
              className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
            >
              <option value="lent">Lent (They owe me)</option>
              <option value="borrowed">Borrowed (I owe them)</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
              required
            />
            <input
              type="text"
              placeholder="Due Date (DD/MM/YYYY)"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-400 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-neutral-50 rounded-xl font-bold transition cursor-pointer"
            >
              Save Record
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-900 pb-3">
        {(["all", "lent", "borrowed", "pending", "settled"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer border ${
              filterTab === tab
                ? "bg-violet-950/20 border-violet-500/20 text-violet-400"
                : "bg-transparent border-transparent hover:bg-neutral-900/40 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List items block */}
      {loading ? (
        <div className="py-8 text-center text-xs text-neutral-500 animate-pulse">
          Syncing balance lists...
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500 border border-dashed border-neutral-900 rounded-2xl">
          No loan records found matching this filter state.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLoans.map((loan) => {
            const outstanding = Number(loan.amount) - Number(loan.paid_amount);
            const percent = Math.min(100, Math.max(0, (Number(loan.paid_amount) / Number(loan.amount)) * 100));

            return (
              <div
                key={loan.id}
                className="bg-neutral-900/10 border border-neutral-800/60 p-5 rounded-2xl flex flex-col justify-between space-y-4"
              >
                {editRecordId === loan.id ? (
                  <form onSubmit={(e) => handleUpdateRecord(e, loan.id)} className="space-y-4">
                    <div className="border-b border-neutral-900 pb-2 flex justify-between items-center">
                      <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">Edit Debt Entry</span>
                      <span className="text-[9px] text-neutral-500 font-semibold">ID: {loan.id.slice(0, 8)}...</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col space-y-1">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase">Friend Name</label>
                        <input
                          type="text"
                          value={editFriendName}
                          onChange={(e) => setEditFriendName(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
                          required
                        />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase">Total Amount (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col space-y-1">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase">Type</label>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as "lent" | "borrowed")}
                          className="bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-2 py-1.5 text-xs text-neutral-200 outline-none"
                        >
                          <option value="lent">Lent (They owe me)</option>
                          <option value="borrowed">Borrowed (I owe them)</option>
                        </select>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase">Due Date (DD/MM/YYYY)</label>
                        <input
                          type="text"
                          value={editDueDate}
                          placeholder="DD/MM/YYYY"
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 text-[10px] pt-1">
                      <button
                        type="button"
                        onClick={() => setEditRecordId(null)}
                        className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-400 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-violet-600 hover:bg-violet-550 text-neutral-50 rounded-lg font-bold transition"
                      >
                        Save Updates
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Friend Header */}
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                      <div>
                        <span className="block font-bold text-neutral-200 text-sm">
                          {loan.friend_name}
                        </span>
                        <span className="text-[10px] text-neutral-500 mt-1 block">
                          {loan.due_date ? `Due Date: ${formatDateToDDMMYYYY(loan.due_date)}` : "No Target Due Date"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            loan.type === "lent"
                              ? "bg-emerald-950/20 border border-emerald-800/30 text-emerald-400"
                              : "bg-rose-950/20 border border-rose-800/30 text-rose-400"
                          }`}
                        >
                          {loan.type === "lent" ? "Lent (Receivable)" : "Borrowed (Payable)"}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            loan.status === "settled"
                              ? "bg-neutral-900 border border-neutral-800 text-neutral-400"
                              : "bg-violet-950/20 border border-violet-850 text-violet-400"
                          }`}
                        >
                          {loan.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress values */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-neutral-500">Repayment Progress</span>
                        <span className="text-neutral-300">
                          ₹{Number(loan.paid_amount).toLocaleString()} / ₹{Number(loan.amount).toLocaleString()} ({percent.toFixed(0)}%)
                        </span>
                      </div>

                      <div className="w-full bg-neutral-900/60 h-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            loan.type === "lent" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Repayment & settlement actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                      {editingLoanId === loan.id ? (
                        <div className="flex items-center gap-2 w-full max-w-[260px]">
                          <input
                            type="number"
                            placeholder="Add Amount (₹)"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-100 outline-none w-full"
                          />
                          <button
                            onClick={() => handleAddPayment(loan)}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-550 text-neutral-50 rounded-lg text-[10px] font-bold transition cursor-pointer flex-shrink-0"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingLoanId(null)}
                            className="text-neutral-500 hover:text-neutral-300 text-[10px] px-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        loan.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingLoanId(loan.id);
                                setPaymentAmount("");
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                            >
                              <Icons.Coins className="w-3.5 h-3.5 text-violet-400" />
                              Record Payback
                            </button>

                            <button
                              onClick={() => handleSettleFull(loan)}
                              className="text-[10px] font-bold text-violet-400 hover:text-violet-300 cursor-pointer"
                            >
                              Settle in Full
                            </button>
                          </div>
                        )
                      )}

                      {loan.status === "settled" && (
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                          <Icons.CheckCircle className="w-3.5 h-3.5 text-neutral-500" />
                          Paid off completely
                        </span>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => handleStartEdit(loan)}
                          className="text-neutral-600 hover:text-violet-450 transition"
                          title="Edit details"
                        >
                          <Icons.Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLoan(loan.id)}
                          className="text-neutral-600 hover:text-red-400 transition"
                          title="Delete record"
                        >
                          <Icons.Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
