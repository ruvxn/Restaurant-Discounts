"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleLogin: authLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = useMemo(() => {
    const redirectParam = searchParams.get("redirect");
    if (redirectParam && redirectParam.startsWith("/")) {
      return redirectParam;
    }
    return null;
  }, [searchParams]);

  const adminView = searchParams.get("admin") === "1";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await authLogin();

        if (redirectTo) {
          router.push(redirectTo);
        } else if (data.role === "ADMIN") {
          router.push("/admin/discounts");
        } else {
          router.push("/customer/home");
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">{adminView ? "Admin portal" : "Customer portal"}</span>
          <h1>{adminView ? "Manage your restaurant" : "Welcome back"}</h1>
          <p>
            {adminView
              ? "Review demand forecasts and fine-tune discounts for your dining room."
              : "Sign in to manage your reservations and keep track of exclusive discounts."}
          </p>
        </div>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="auth-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {!adminView && (
          <p className="auth-footer">
            Don&apos;t have an account? <Link href="/signup">Create one</Link>
          </p>
        )}
      </div>
    </div>
  );
}
