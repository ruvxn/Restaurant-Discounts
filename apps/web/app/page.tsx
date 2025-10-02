"use client";

import Link from "next/link";
import styles from "./Landing.module.css";

export default function HomePage() {
  return (
    <div className={styles.hero}>
      <div className={styles.container}>
        <section className={styles.heroContent}>
          <span className={styles.badge}>Dining rewards reinvented</span>
          <h1 className={styles.title}>Enjoy the city&apos;s best restaurants with exclusive savings</h1>
          <p className={styles.subtitle}>
            Restaurant Discounts helps diners discover off-peak deals, pre-order signature dishes, and
            arrive to a perfectly set table. Join thousands of food lovers already saving on every
            reservation.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/customer/home">
              Browse restaurants
            </Link>
            <Link className={styles.secondaryButton} href="/signup">
              Create an account
            </Link>
            <Link className={styles.tertiaryButton} href="/login?admin=1">
              Restaurant owner?
            </Link>
          </div>
        </section>

        <aside className={styles.panel}>
          <h3>How it works</h3>
          <ul>
            <li>
              <strong>Discover</strong>
              <span>Browse local restaurants and see real-time discount offers</span>
            </li>
            <li>
              <strong>Book</strong>
              <span>Reserve your table during off-peak hours and save up to 40%</span>
            </li>
            <li>
              <strong>Enjoy</strong>
              <span>Pre-order your meal and arrive to a perfectly set table</span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
