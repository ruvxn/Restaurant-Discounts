"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import CustomerNav from "@/components/CustomerNav";
import styles from "./UserProfile.module.css";

type User = {
  name: string;
  email: string;
  birthday: string;
  phone: string;
  interests: string[];
};

export default function UserProfile() {
  const router = useRouter();
  const { user: authUser, isLoggedIn, role, initializing, refreshSession } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [user, setUser] = useState<User>({
    name: "",
    email: "",
    birthday: "",
    phone: "",
    interests: [],
  });

  useEffect(() => {
    async function fetchProfile() {
      if (initializing) return;

      if (!isLoggedIn || role !== "CUSTOMER") {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/customer/profile");
        if (response.ok) {
          const data = await response.json();
          console.log("Profile data received:", data);
          setUser({
            name: data.name || "",
            email: data.email || "",
            birthday: data.birthday ? new Date(data.birthday).toISOString().split("T")[0] : "",
            phone: data.phone || "",
            interests: data.interests || [],
          });
        } else {
          const errorData = await response.json();
          console.error("Failed to fetch profile:", errorData);
          setError("Failed to load profile data");
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Network error loading profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [isLoggedIn, role, initializing, router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddInterest = () => {
    if (interestInput.trim() && !user.interests.includes(interestInput.trim())) {
      setUser((prev) => ({
        ...prev,
        interests: [...prev.interests, interestInput.trim()],
      }));
      setInterestInput("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setUser((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          birthday: user.birthday || null,
          phone: user.phone || null,
          interests: user.interests,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Profile updated successfully!");
        setEditMode(false);
        // Refresh the auth session to update displayed name
        await refreshSession();
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (initializing || loading) {
    return (
      <>
        <CustomerNav />
        <div className={styles["user-profile"]}>
          <div>Loading profile...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <CustomerNav />
      <div className={styles["user-profile"]}>
        <h2>User Profile</h2>

        {/* Success/Error messages */}
        {success && (
          <div style={{ padding: "12px", background: "#d1fae5", color: "#065f46", borderRadius: "8px", marginBottom: "16px" }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ padding: "12px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* Profile picture + name */}
        <div className={styles["user-avatar-section"]}>
          <div className={styles["user-avatar-wrap"]}>
            <svg width="64" height="64" fill="none" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="32" fill="#f0f0f0" />
              <circle cx="32" cy="28" r="14" fill="#cccccc" />
              <ellipse cx="32" cy="54" rx="18" ry="10" fill="#cccccc" />
            </svg>
          </div>
          <div className={styles["user-username"]}>{user.name}</div>
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className={`${styles["user-edit-btn"]} ${editMode ? styles["editing"] : ""}`}
            type="button"
          >
            {editMode ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {/* Profile information */}
        <form onSubmit={handleSave} className={styles["user-info-section"]}>
          <div className={styles["info-row"]}>
            <span>Name:</span>
            {editMode ? (
              <input name="name" value={user.name} onChange={handleChange} required />
            ) : (
              <div>{user.name}</div>
            )}
          </div>

          <div className={styles["info-row"]}>
            <span>Email:</span>
            {editMode ? (
              <input type="email" name="email" value={user.email} onChange={handleChange} required />
            ) : (
              <div>{user.email}</div>
            )}
          </div>

          <div className={styles["info-row"]}>
            <span>Birthday:</span>
            {editMode ? (
              <input type="date" name="birthday" value={user.birthday} onChange={handleChange} />
            ) : (
              <div>{user.birthday || "Not set"}</div>
            )}
          </div>

          <div className={styles["info-row"]}>
            <span>Phone Number:</span>
            {editMode ? (
              <input type="tel" name="phone" value={user.phone} onChange={handleChange} />
            ) : (
              <div>{user.phone || "Not set"}</div>
            )}
          </div>

          <div className={styles["info-row"]}>
            <span>Interests:</span>
            {editMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Add an interest"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInterest();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddInterest}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
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
                {user.interests.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {user.interests.map((interest) => (
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
              </div>
            ) : (
              <div>
                {user.interests.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {user.interests.map((interest) => (
                      <span
                        key={interest}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "999px",
                          background: "rgba(255, 112, 67, 0.15)",
                          color: "#f25d2d",
                          fontSize: "0.875rem",
                        }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  "Not set"
                )}
              </div>
            )}
          </div>

          {editMode && (
            <button type="submit" className={styles["edit-button"]} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </form>
      </div>
    </>
  );
}
