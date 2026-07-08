import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";
import { Category } from "@/hooks/use-expenses";

export interface BudgetProgress {
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  over_limit: boolean;
}

export interface Budget {
  id: string;
  category_id: string;
  category: Category;
  amount_limit: number;
  period: string;
  alert_pct: number;
  spent: number;
  progress: BudgetProgress;
}

export function useBudgets(period: string) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    if (!period) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/budgets?period=${period}`);
      setBudgets(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch budgets");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  return { budgets, loading, error, refetch: fetchBudgets };
}

export function useBudgetMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBudget = async (data: {
    category_id: string;
    amount_limit: number;
    period: string;
    alert_pct?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi("/budgets", {
        method: "POST",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to create budget");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBudget = async (
    id: string,
    data: {
      amount_limit?: number;
      period?: string;
      alert_pct?: number;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/budgets/${id}`, {
        method: "PUT",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to update budget");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBudget = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi(`/budgets/${id}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete budget");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createBudget,
    updateBudget,
    deleteBudget,
    loading,
    error,
  };
}
