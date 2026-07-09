import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi } from "@/lib/api-client";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  category: Category | null;
  amount: number;
  merchant: string;
  payment_method: string;
  date: string;
  notes: string | null;
  receipt_id: string | null;
  ai_categorized: boolean;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFilters {
  page?: number;
  limit?: number;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi("/categories");
      setCategories(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
}

export function useExpenses(filters: ExpenseFilters = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const fetchExpenses = useCallback(async () => {
    try {
      if (!hasFetchedOnce.current) {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.category) params.append("category", filters.category);
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.search) params.append("search", filters.search);
      if (filters.sort) params.append("sort", filters.sort);

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const response = await fetchApi(`/expenses${queryString}`);

      setExpenses(response.data || []);
      if (response.meta) {
        setMeta(response.meta);
      }
      hasFetchedOnce.current = true;
    } catch (err: any) {
      setError(err.message || "Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.limit,
    filters.category,
    filters.from,
    filters.to,
    filters.search,
    filters.sort,
  ]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, meta, loading, error, refetch: fetchExpenses };
}

export function useExpenseMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExpense = async (data: {
    amount: number;
    merchant: string;
    payment_method: string;
    date: string;
    category_id?: string | null;
    notes?: string | null;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi("/expenses", {
        method: "POST",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to create expense");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateExpense = async (
    id: string,
    data: {
      amount?: number;
      merchant?: string;
      payment_method?: string;
      date?: string;
      category_id?: string | null;
      notes?: string | null;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/expenses/${id}`, {
        method: "PUT",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to update expense");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi(`/expenses/${id}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete expense");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const bulkDeleteExpenses = async (ids: string[]) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi("/expenses/bulk-delete", {
        method: "POST",
        json: { ids },
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete expenses in bulk");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createExpense,
    updateExpense,
    deleteExpense,
    bulkDeleteExpenses,
    loading,
    error,
  };
}
