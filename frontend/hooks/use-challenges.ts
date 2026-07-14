import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi } from "@/lib/api-client";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: string;
  current: string;
  status: "completed" | "in_progress";
  badge_reward: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
  color: string;
}

export interface ChallengesData {
  challenges: Challenge[];
  badges: Badge[];
}

export function useChallenges(period: string) {
  const [data, setData] = useState<ChallengesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const fetchChallenges = useCallback(async () => {
    if (!period) return;
    try {
      if (!hasFetchedOnce.current) {
        setLoading(true);
      }
      setError(null);
      const response = await fetchApi(`/analytics/challenges?period=${period}`);
      setData(response.data || { challenges: [], badges: [] });
      hasFetchedOnce.current = true;
    } catch (err: any) {
      setError(err.message || "Failed to fetch challenges progress");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  return { data, loading, error, refetch: fetchChallenges };
}
