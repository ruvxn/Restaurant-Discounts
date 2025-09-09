"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const savedLogin = localStorage.getItem("isLoggedIn");
    const savedRole = localStorage.getItem("role");
    if (savedLogin === "true") {
      setIsLoggedIn(true);
      setRole(savedRole || "");
    }
  }, []);

  const handleLogin = (selectedRole: string) => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("role", selectedRole);
    setIsLoggedIn(true);
    setRole(selectedRole);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setRole("");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, role, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
