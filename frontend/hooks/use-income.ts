import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";

export interface Income {
  id: string;
  user_id: string;
  source: string;
  amount: number;
  date: string;
  notes: string | null;
  is_recurring: boolean;
  created_at: string;
}

export interface IncomeFilters {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export function useIncome(filters: IncomeFilters = {}) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncome = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const response = await fetchApi(`/income${queryString}`);

      setIncomes(response.data || []);
      if (response.meta) {
        setMeta(response.meta);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch income logs");
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.limit, filters.from, filters.to]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  return { incomes, meta, loading, error, refetch: fetchIncome };
}

export function useIncomeMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createIncome = async (data: {
    source: string;
    amount: number;
    date: string;
    notes?: string | null;
    is_recurring?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi("/income", {
        method: "POST",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to record income");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateIncome = async (
    id: string,
    data: {
      source?: string;
      amount?: number;
      date?: string;
      notes?: string | null;
      is_recurring?: boolean;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/income/${id}`, {
        method: "PUT",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to update income record");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteIncome = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi(`/income/${id}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete income record");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createIncome,
    updateIncome,
    deleteIncome,
    loading,
    error,
  };
}
