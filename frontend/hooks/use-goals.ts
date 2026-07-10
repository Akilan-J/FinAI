import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi } from "@/lib/api-client";

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  created_at: string;
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const fetchGoals = useCallback(async () => {
    try {
      if (!hasFetchedOnce.current) {
        setLoading(true);
      }
      setError(null);
      const response = await fetchApi("/goals");
      setGoals(response.data || []);
      hasFetchedOnce.current = true;
    } catch (err: any) {
      setError(err.message || "Failed to fetch goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return { goals, loading, error, refetch: fetchGoals };
}

export function useGoalMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGoal = async (data: {
    name: string;
    target_amount: number;
    current_amount?: number;
    target_date: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi("/goals", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to create goal");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = async (
    id: string,
    data: {
      name?: string;
      target_amount?: number;
      current_amount?: number;
      target_date?: string;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to update goal");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi(`/goals/${id}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete goal");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createGoal, updateGoal, deleteGoal, loading, error };
}
