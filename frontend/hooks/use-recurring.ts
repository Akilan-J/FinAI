import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi } from "@/lib/api-client";

export interface RecurringBill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  frequency: string;
  next_due_date: string;
  created_at: string;
}

export function useRecurringBills() {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const fetchBills = useCallback(async () => {
    try {
      if (!hasFetchedOnce.current) {
        setLoading(true);
      }
      setError(null);
      const response = await fetchApi("/recurring-bills");
      setBills(response.data || []);
      hasFetchedOnce.current = true;
    } catch (err: any) {
      setError(err.message || "Failed to fetch recurring bills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return { bills, loading, error, refetch: fetchBills };
}

export function useRecurringMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBill = async (data: {
    name: string;
    amount: number;
    category?: string;
    frequency?: string;
    next_due_date: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi("/recurring-bills", {
        method: "POST",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to create recurring bill");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBill = async (
    id: string,
    data: {
      name?: string;
      amount?: number;
      category?: string;
      frequency?: string;
      next_due_date?: string;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/recurring-bills/${id}`, {
        method: "PATCH",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to update recurring bill");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBill = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi(`/recurring-bills/${id}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete recurring bill");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createBill, updateBill, deleteBill, loading, error };
}
