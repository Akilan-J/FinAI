import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";

export interface AnalyticsSummary {
  total_spent: number;
  total_income: number;
  net_savings: number;
  savings_rate: number;
  active_budgets_count: number;
  over_budget_count: number;
}

export interface CategoryDistributionItem {
  category_id: string | null;
  category_name: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrendItem {
  period: string; // YYYY-MM
  total_spent: number;
  total_income: number;
}

export function useAnalyticsSummary(period: string) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!period) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/analytics/summary?period=${period}`);
      setSummary(response.data || null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch summary statistics");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}

export function useCategoryDistribution(period: string) {
  const [distribution, setDistribution] = useState<CategoryDistributionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDistribution = useCallback(async () => {
    if (!period) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/analytics/category-distribution?period=${period}`);
      setDistribution(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch category distributions");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDistribution();
  }, [fetchDistribution]);

  return { distribution, loading, error, refetch: fetchDistribution };
}

export function useMonthlyTrends(limit = 6) {
  const [trends, setTrends] = useState<MonthlyTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/analytics/monthly-trends?limit=${limit}`);
      setTrends(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch monthly trends");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, error, refetch: fetchTrends };
}
