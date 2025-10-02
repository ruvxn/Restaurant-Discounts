"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

export default function SignUp() {
  const router = useRouter();
  const { handleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");

  const handleAddInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const name = formData.get("username") as string;

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email,
        password,
        role: "CUSTOMER",
        name,
        interests,
      };

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Signup auto-logs in, so just refresh session and redirect
        await handleLogin();
        router.push("/customer/home");
      } else {
        setError(data.error || "Signup failed");
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
          <span className="auth-badge">Create account</span>
          <h1>Join Restaurant Discounts</h1>
          <p>Build your profile and start booking tables with exclusive savings today.</p>
        </div>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <form className="auth-form" onSubmit={handleSignup}>
          <label className="auth-label" htmlFor="signup-username">
            Name
          </label>
          <input
            id="signup-username"
            name="username"
            className="auth-input"
            type="text"
            placeholder="Your name"
            required
          />

          <label className="auth-label" htmlFor="signup-email">
            Email address
          </label>
          <input
            id="signup-email"
            name="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />

          <label className="auth-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            required
          />

          <label className="auth-label" htmlFor="signup-confirm-password">
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            name="confirmPassword"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your password"
            required
          />

          <label className="auth-label" htmlFor="signup-interests">
            Interests (optional)
          </label>
          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
            <input
              id="signup-interests"
              className="auth-input"
              type="text"
              placeholder="e.g., Italian food, Jazz music"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddInterest();
                }
              }}
              style={{ marginTop: 0 }}
            />
            <button
              type="button"
              onClick={handleAddInterest}
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 143, 102, 0.5)",
                background: "rgba(255, 112, 67, 0.1)",
                color: "#f25d2d",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Add
            </button>
          </div>
          {interests.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              {interests.map((interest) => (
                <span
                  key={interest}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: "rgba(255, 112, 67, 0.15)",
                    color: "#f25d2d",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#f25d2d",
                      cursor: "pointer",
                      padding: "0 2px",
                      fontSize: "1rem",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
