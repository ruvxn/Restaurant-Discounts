"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import styles from "./UserProfile.module.css";

type User = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  birthday: string;
  phone: string;
  avatar: string;
};

const initialUser: User = {
  username: "johndoe00",
  firstName: "John",
  lastName: "Doe",
  email: "jdoe@gmail.com",
  birthday: "1990-01-09",
  phone: "0412 345 678",
  avatar: "",
};

export default function UserProfile() {
  const [editMode, setEditMode] = useState(false);
  const [user, setUser] = useState<User>(initialUser);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setEditMode(false);
    // ✅ Optional: Add API call here to save changes
  };

  return (
    <div className={styles["user-profile"]}>
      <h2>User Profile</h2>

      {/* Profile picture + username */}
      <div className={styles["user-avatar-section"]}>
        <div className={styles["user-avatar-wrap"]}>
          {user.avatar ? (
            <img src={user.avatar} alt="avatar" />
          ) : (
            <svg width="64" height="64" fill="none" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="32" fill="#f0f0f0" />
              <circle cx="32" cy="28" r="14" fill="#cccccc" />
              <ellipse cx="32" cy="54" rx="18" ry="10" fill="#cccccc" />
            </svg>
          )}
        </div>
        <div className={styles["user-username"]}>@{user.username}</div>
        <button
          onClick={() => setEditMode((prev) => !prev)}
          className={`${styles["user-edit-btn"]} ${editMode ? styles["editing"] : ""}`}
        >
          {editMode ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {/* Profile information */}
      <form onSubmit={handleSave} className={styles["user-info-section"]}>
        <div className={styles["info-row"]}>
          <span>First Name:</span>
          {editMode ? (
            <input name="firstName" value={user.firstName} onChange={handleChange} required />
          ) : (
            <div>{user.firstName}</div>
          )}
        </div>

        <div className={styles["info-row"]}>
          <span>Last Name:</span>
          {editMode ? (
            <input name="lastName" value={user.lastName} onChange={handleChange} required />
          ) : (
            <div>{user.lastName}</div>
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
            <input type="date" name="birthday" value={user.birthday} onChange={handleChange} required />
          ) : (
            <div>{user.birthday}</div>
          )}
        </div>

        <div className={styles["info-row"]}>
          <span>Phone Number:</span>
          {editMode ? (
            <input type="tel" name="phone" value={user.phone} onChange={handleChange} />
          ) : (
            <div>{user.phone}</div>
          )}
        </div>

        {editMode && (
          <button type="submit" className={styles["edit-button"]}>
            Save Changes
          </button>
        )}
      </form>
    </div>
  );
}
