"use client";

import { useEffect, useState } from "react";
import styles from "./Discounts.module.css";

const defaultHours = [
  { time: "08:00", discount: 15 },
  { time: "09:00", discount: 20 },
  { time: "10:00", discount: 10 },
  { time: "11:00", discount: 10 },
  { time: "12:00", discount: 30 },
  { time: "13:00", discount: 20 },
  { time: "14:00", discount: 10 },
  { time: "15:00", discount: 10 },
  { time: "16:00", discount: 5 },
  { time: "17:00", discount: 15 },
  { time: "18:00", discount: 20 },
  { time: "19:00", discount: 25 },
  { time: "20:00", discount: 10 },
  { time: "21:00", discount: 5 },
  { time: "22:00", discount: 10 },
];

const discountOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export default function Discounts({ weekday = "Friday", totalSeats = 80 }) {
  const [hours, setHours] = useState(defaultHours);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        const url = `${API_BASE}/api/discounts?weekday=${encodeURIComponent(
          weekday
        )}&total_seats=${encodeURIComponent(totalSeats)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const cleaned = Array.isArray(data)
          ? data
              .map((d) => ({
                time: String(d.time ?? ""),
                discount: Number(d.discount ?? 0),
              }))
              .sort((a, b) => a.time.localeCompare(b.time))
          : defaultHours;

        if (!cancelled) setHours(cleaned);
      } catch (e) {
        console.warn("Failed to load discounts:", e);
        if (!cancelled) {
          setErr("Showing default discounts (live fetch failed).");
          setHours(defaultHours);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [weekday, totalSeats, API_BASE]);

  const handleSelect = (index: number, newDiscount: number | string) => {
    setHours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], discount: parseInt(String(newDiscount), 10) };
      return updated;
    });
  };

  const handleAccept = async () => {
    try {
      setSaving(true);
      const restaurantId = 1; // Example ID
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/discounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hours),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      alert("Discounts saved!");
    } catch (e) {
      console.error(e);
      alert("Failed to save discounts. Check console/server logs.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles["discounts-table-container"]}>
        <h2>Set Discounts for Time Slots</h2>
        <div>Loading discounts…</div>
      </div>
    );
  }

  return (
    <div className={styles["discounts-table-container"]}>
      <h2>Set Discounts for Time Slots</h2>
      {!!err && <div style={{ color: "#c33", marginBottom: 8 }}>{err}</div>}
      <table className={styles["discounts-table"]}>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Discount</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((slot, idx) => (
            <tr key={slot.time || idx}>
              <td>{slot.time}</td>
              <td>
                <div className={styles["discount-wrapper"]}>
                  <select
                    className={styles["discount-select"]}
                    value={slot.discount}
                    onChange={(e) => handleSelect(idx, e.target.value)}
                  >
                    {discountOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}%
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className={styles["accept-button"]}
        onClick={handleAccept}
        disabled={saving}
      >
        {saving ? "Saving..." : "Accept"}
      </button>
    </div>
  );
}
