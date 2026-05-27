"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  getMe,
  getCreditBalance,
  setAuthCallbacks,
  refreshTokenRequest,
  ApiError,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  user_id: string;
  email?: string;
  nickname?: string;
  role?: string;
  status?: string;
}

export interface CreditBalance {
  balance: number;
  frozen: number;
  available: number;
  total_recharged: number;
  total_consumed: number;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  credits: CreditBalance | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    email?: string;
    phone?: string;
    password: string;
    nickname?: string;
  }) => Promise<void>;
  logout: () => void;
  /** Call this to refresh the access token using stored refresh token. */
  tryRefresh: () => Promise<string | null>;
  /** Refresh credit balance from backend. */
  refreshCredits: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- helpers ----
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setCredits(null);
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const data = await getCreditBalance();
      setCredits({
        balance: data.balance,
        frozen: data.frozen,
        available: data.available,
        total_recharged: data.total_recharged,
        total_consumed: data.total_consumed,
      });
    } catch {
      // Silently fail — credits may be unavailable
    }
  }, []);

  const fetchUser = useCallback(async (tk: string) => {
    try {
      const data = await getMe();
      setToken(tk);
      setUser({
        user_id: data.user_id,
        email: data.email,
        nickname: data.nickname,
        role: data.role,
        status: data.status,
      });
      // Fetch credit balance
      await refreshCredits();
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth, refreshCredits]);

  // ---- tryRefresh (called by api.ts auto-refresh) ----
  // IMPORTANT: defined before useEffect that references it (TDZ safety)
  const tryRefresh = useCallback(async (): Promise<string | null> => {
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!rt) return null;
    try {
      const result = await refreshTokenRequest(rt);
      localStorage.setItem(TOKEN_KEY, result.access_token);
      return result.access_token;
    } catch {
      clearAuth();
      return null;
    }
  }, [clearAuth]);

  // ---- Restore session on mount ----
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }

    // Wire auto-refresh callback into api.ts
    if (typeof setAuthCallbacks === "function") {
      setAuthCallbacks({
        onRefresh: tryRefresh,
        onLogout: () => {
          clearAuth();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAuth, tryRefresh]);

  // ---- login ----
  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiLogin({ username, password });
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      setToken(data.access_token);
      setUser({
        user_id: data.user_id,
        email: data.email,
        nickname: data.nickname,
      });
      // Fetch credit balance after login
      await refreshCredits();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshCredits]);

  // ---- register ----
  const register = useCallback(
    async (data: {
      email?: string;
      phone?: string;
      password: string;
      nickname?: string;
    }) => {
      setError(null);
      setLoading(true);
      try {
        const res = await apiRegister(data);
        localStorage.setItem(TOKEN_KEY, res.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, res.refresh_token);
        setToken(res.access_token);
        setUser({
          user_id: res.user_id,
          email: res.email,
          nickname: res.nickname,
        });
        // Fetch credit balance after registration (should be 500)
        await refreshCredits();
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Registration failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshCredits]
  );

  // ---- logout ----
  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  // ---- value ----
  const value: AuthContextType = {
    user,
    token,
    credits,
    loading,
    error,
    login,
    register,
    logout,
    tryRefresh,
    refreshCredits,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthContext;
