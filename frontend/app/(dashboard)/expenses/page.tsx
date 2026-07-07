"use client";

import React, { useState, startTransition } from "react";
import * as Icons from "lucide-react";
import { useCategories, useExpenses, useExpenseMutations, Expense } from "@/hooks/use-expenses";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseFormDrawer from "@/components/expenses/ExpenseFormDrawer";

export default function ExpensesPage() {
  const { categories } = useCategories();

  // Filter States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date:desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Active query hook
  const { expenses, meta, loading, refetch } = useExpenses({
    page,
    limit,
    category: categoryFilter || undefined,
    from: from || undefined,
    to: to || undefined,
    search: search || undefined,
    sort,
  });

  const {
    createExpense,
    updateExpense,
    deleteExpense,
    bulkDeleteExpenses,
    loading: mutationLoading,
  } = useExpenseMutations();

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);

  // Checkbox state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clear filters helper
  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setPaymentMethod("");
    setFrom("");
    setTo("");
    setSort("date:desc");
    setPage(1);
  };

  // Selection handlers
  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = (allIds: string[]) => {
    setSelectedIds((prev) => (prev.length === allIds.length ? [] : [...allIds]));
  };

  // Actions handlers
  const handleOpenAddDrawer = () => {
    setActiveExpense(null);
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (expense: Expense) => {
    setActiveExpense(expense);
    setDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteExpense(id);
        refetch();
        setSelectedIds((prev) => prev.filter((item) => item !== id));
      } catch (err: any) {
        alert(err.message || "Failed to delete expense");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (
      confirm(
        `Are you sure you want to delete ${selectedIds.length} selected transaction(s)?`
      )
    ) {
      try {
        await bulkDeleteExpenses(selectedIds);
        refetch();
        setSelectedIds([]);
      } catch (err: any) {
        alert(err.message || "Failed to bulk delete expenses");
      }
    }
  };

  const handleDrawerSubmit = async (data: {
    amount: number;
    merchant: string;
    payment_method: string;
    date: string;
    category_id?: string | null;
    notes?: string | null;
  }) => {
    if (activeExpense) {
      // Edit mode
      await updateExpense(activeExpense.id, data);
    } else {
      // Create mode
      await createExpense(data);
    }
    refetch();
  };

  // Pagination helper
  const totalPages = Math.ceil(meta.total / limit);

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            Expenses History
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Review and search transactions, apply custom category filters, or upload receipt logs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddDrawer}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-neutral-50 shadow-lg shadow-violet-500/25 cursor-pointer transition-all duration-200"
          >
            <Icons.Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <ExpenseFilters
        categories={categories}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        category={categoryFilter}
        onCategoryChange={(val) => {
          setCategoryFilter(val);
          setPage(1);
        }}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={(val) => {
          setPaymentMethod(val);
          setPage(1);
        }}
        from={from}
        onFromChange={(val) => {
          setFrom(val);
          setPage(1);
        }}
        to={to}
        onToChange={(val) => {
          setTo(val);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(val) => {
          setSort(val);
          setPage(1);
        }}
        onClear={handleClearFilters}
      />

      {/* Main Table */}
      <ExpenseTable
        expenses={expenses}
        loading={loading}
        selectedIds={selectedIds}
        onSelectToggle={handleSelectToggle}
        onSelectAllToggle={handleSelectAllToggle}
        onEdit={handleOpenEditDrawer}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-900 text-sm">
          <span className="text-xs text-neutral-500">
            Showing Page {page} of {totalPages} ({meta.total} total items)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => startTransition(() => setPage((p) => Math.max(1, p - 1)))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
              title="Previous Page"
            >
              <Icons.ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => startTransition(() => setPage((p) => Math.min(totalPages, p + 1)))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
              title="Next Page"
            >
              <Icons.ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ExpenseFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={categories}
        expense={activeExpense}
        onSubmit={handleDrawerSubmit}
        loading={mutationLoading}
      />
    </div>
  );
}
