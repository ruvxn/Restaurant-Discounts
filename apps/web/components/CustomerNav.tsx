"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import styles from "./CustomerNav.module.css";

export default function CustomerNav() {
  const router = useRouter();
  const { user, isLoggedIn, role, handleLogout, initializing } = useAuth();
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const displayName = useMemo(() => {
    if (user?.customer?.name) return user.customer.name;
    if (user?.admin?.name) return user.admin.name;
    return user?.email ?? "Guest";
  }, [user]);

  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    // Delay closing by 300ms to allow user to move mouse to dropdown
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 300);
  };

  const goTo = (path: string) => {
    // Clear timeout and close immediately on navigation
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(false);
    router.push(path);
  };

  const signOut = async () => {
    // Clear timeout and close immediately on sign out
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    await handleLogout();
    setOpen(false);
    router.push("/login");
  };

  const menuItems = () => {
    if (!isLoggedIn) {
      return (
        <>
          <div className={styles.dropdownLabel}>Welcome</div>
          <button className={styles.dropdownItem} onClick={() => goTo("/login")}>Sign in</button>
          <button className={styles.dropdownItem} onClick={() => goTo("/signup")}>Create account</button>
          <div className={styles.dropdownDivider} />
          <button className={styles.dropdownItem} onClick={() => goTo("/login?admin=1")}>Admin portal</button>
        </>
      );
    }

    if (role === "ADMIN") {
      return (
        <>
          <div className={styles.dropdownLabel}>Signed in as</div>
          <div className={styles.dropdownItem} onClick={() => setOpen(false)}>{displayName}</div>
          <div className={styles.dropdownDivider} />
          <button className={styles.dropdownItem} onClick={() => goTo("/admin/discounts")}>View discounts</button>
          <button className={styles.dropdownItem} onClick={() => goTo("/admin/dashboard")}>View dashboard</button>
          <div className={styles.dropdownDivider} />
          <button className={styles.dropdownItem} onClick={signOut}>Sign out</button>
        </>
      );
    }

    return (
      <>
        <div className={styles.dropdownLabel}>Signed in as</div>
        <div className={styles.dropdownItem} onClick={() => setOpen(false)}>{displayName}</div>
        <div className={styles.dropdownDivider} />
        <button className={styles.dropdownItem} onClick={() => goTo("/customer/bookings")}>My bookings</button>
        <button className={styles.dropdownItem} onClick={() => goTo("/customer/profile")}>Profile settings</button>
        <div className={styles.dropdownDivider} />
        <button className={styles.dropdownItem} onClick={signOut}>Sign out</button>
      </>
    );
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.brand} onClick={() => goTo("/customer/home")}>Restaurant Discounts</div>
      <div className={styles.links}>
        <button className={styles.linkButton} onClick={() => goTo("/customer/home")}>Browse restaurants</button>
        <div
          className={styles.profileWrapper}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className={styles.profileButton}
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Account menu"
            type="button"
          >
            <FiUser size={20} />
          </button>
          {open && !initializing && (
            <div
              className={styles.dropdown}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {menuItems()}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
