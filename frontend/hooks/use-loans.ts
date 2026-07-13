import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi } from "@/lib/api-client";

export interface Loan {
  id: string;
  user_id: string;
  friend_name: string;
  type: "lent" | "borrowed";
  amount: number;
  paid_amount: number;
  status: "pending" | "settled";
  due_date: string | null;
  created_at: string;
}

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const fetchLoans = useCallback(async () => {
    try {
      if (!hasFetchedOnce.current) {
        setLoading(true);
      }
      setError(null);
      const response = await fetchApi("/loans");
      setLoans(response.data || []);
      hasFetchedOnce.current = true;
    } catch (err: any) {
      setError(err.message || "Failed to fetch loans records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  return { loans, loading, error, refetch: fetchLoans };
}

export function useLoanMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLoan = async (data: {
    friend_name: string;
    type: "lent" | "borrowed";
    amount: number;
    paid_amount?: number;
    status?: "pending" | "settled";
    due_date?: string | null;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi("/loans", {
        method: "POST",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to create loan record");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateLoan = async (
    id: string,
    data: {
      friend_name?: string;
      type?: "lent" | "borrowed";
      amount?: number;
      paid_amount?: number;
      status?: "pending" | "settled";
      due_date?: string | null;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/loans/${id}`, {
        method: "PATCH",
        json: data,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to update loan record");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteLoan = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi(`/loans/${id}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete loan record");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createLoan, updateLoan, deleteLoan, loading, error };
}
