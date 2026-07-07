"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fetchApi, setAccessToken } from "../lib/api-client";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const refreshResponse = await fetchApi("/auth/refresh", { method: "POST" }).catch(() => null);
      if (refreshResponse && refreshResponse.data?.access_token) {
        setAccessToken(refreshResponse.data.access_token);
        const meResponse = await fetchApi("/auth/me");
        setUser(meResponse.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetchApi("/auth/login", {
        method: "POST",
        json: { email, password },
      });
      if (response.data?.access_token) {
        setAccessToken(response.data.access_token);
        const meResponse = await fetchApi("/auth/me");
        setUser(meResponse.data);
      }
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    try {
      await fetchApi("/auth/register", {
        method: "POST",
        json: { email, password, full_name: fullName },
      });
      await login(email, password);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setAccessToken(null);
      setUser(null);
      setLoading(false);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
