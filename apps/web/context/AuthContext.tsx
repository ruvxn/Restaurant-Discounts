"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

type Role = "ADMIN" | "CUSTOMER";

type AuthUser = {
  accountId: number;
  email: string;
  role: Role;
  customer?: { id: number; name: string | null } | null;
  admin?: { id: number; name: string | null; restaurantId: number | null } | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  role: Role | "";
  initializing: boolean;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem("role");
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        clearSession();
        return;
      }

      const data = await response.json();
      const nextUser: AuthUser = {
        accountId: data.accountId,
        email: data.email,
        role: data.role,
        customer: data.customer ?? null,
        admin: data.admin ?? null,
      };

      setUser(nextUser);
      localStorage.setItem("role", nextUser.role);
    } catch (error) {
      console.error("Failed to refresh auth session", error);
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    refreshSession().finally(() => setInitializing(false));
  }, [refreshSession]);

  const handleLogin = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout request failed", error);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      role: user?.role ?? "",
      initializing,
      handleLogin,
      handleLogout,
      refreshSession,
    }),
    [user, initializing, handleLogin, handleLogout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
