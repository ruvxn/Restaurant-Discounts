"use client";

import { useState, useEffect } from "react";
import styles from "./DiscountDisplay.module.css";

type Discount = {
  time: string;
  discount: number;
};

type DiscountDisplayProps = {
  restaurantId: string;
  date?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
};

export default function DiscountDisplay({
  restaurantId,
  date,
  autoRefresh = false,
  refreshInterval = 5 * 60 * 1000,
}: DiscountDisplayProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      setError("");

      const targetDate = date || new Date().toISOString().split("T")[0];
      const response = await fetch(`/api/restaurants/${restaurantId}/discounts?date=${targetDate}`);

      if (!response.ok) {
        throw new Error("Failed to fetch discounts");
      }

      const data = await response.json();
      setDiscounts(data.discounts || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError("Failed to load discounts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchDiscounts();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [restaurantId, date, autoRefresh, refreshInterval]);

  const getDiscountColor = (discount: number) => {
    if (discount >= 40) return "#ff5a1f";
    if (discount >= 20) return "#ff7043";
    if (discount >= 5) return "#f6ad55";
    return "#d2957b";
  };

  const getDiscountLabel = (discount: number) => {
    if (discount >= 40) return "Outstanding savings";
    if (discount >= 20) return "Great deal";
    if (discount >= 5) return "Nice perk";
    return "Regular pricing";
  };

  if (loading) {
    return <div className={styles.state}>Loading discounts…</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button className={styles.refreshButton} onClick={fetchDiscounts}>
          Try again
        </button>
      </div>
    );
  }

  if (discounts.length === 0) {
    return <div className={styles.state}>No discounts available for this date.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>Available discounts</h3>
        <div className={styles.refreshGroup}>
          {autoRefresh && <span>Last updated {lastRefresh.toLocaleTimeString()}</span>}
          <button className={styles.refreshButton} onClick={fetchDiscounts}>
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {discounts.map((slot) => (
          <div className={styles.tile} key={slot.time}>
            <span className={styles.tileTime}>{slot.time}</span>
            <span
              className={styles.tileDiscount}
              style={{ color: getDiscountColor(slot.discount) }}
            >
              {slot.discount}%
            </span>
            <span className={styles.tileLabel}>{slot.discount > 0 ? "Off" : "Regular"}</span>
            <span className={styles.tileQuality}>{getDiscountLabel(slot.discount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
