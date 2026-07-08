"use client";
// AITradeMinds — Auth context. Single source of client auth state.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "./api-client";
import dynamic from "next/dynamic";

export interface SessionUser {
  id: number;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<{ user: SessionUser }>("/api/v1/auth/me");
      setUser(data.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: SessionUser; token: string }>("/api/v1/auth/login", {
      email,
      password,
    });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const data = await api.post<{ user: SessionUser; token: string }>(
        "/api/v1/auth/register",
        { email, password, displayName },
      );
      setToken(data.token);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      /* ignore */
    }
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const SafeAppShell = dynamic(
  () => import("@/components/AppShell").then((m) => m.AppShell),
  { ssr: false }
);

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SafeAppShell>{children}</SafeAppShell>
    </AuthProvider>
  );
}
