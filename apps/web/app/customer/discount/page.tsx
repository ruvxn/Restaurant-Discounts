"use client";

import styles from "./UserDiscounts.module.css";

const discounts = [
  {
    id: 1,
    restaurant: "Sunset Grill",
    meal: "Set A",
    percent: 40,
    time: "3pm - 6pm",
  },
  {
    id: 2,
    restaurant: "Pasta Place",
    meal: "Family Combo",
    percent: 30,
    time: "6pm - 9pm",
  },
  {
    id: 3,
    restaurant: "Sushi House",
    meal: "Lunch Special",
    percent: 25,
    time: "12pm - 2pm",
  },
];

export default function UserDiscounts() {
  return (
    <div className={styles["user-content"]}>
      <h2 className={styles["user-discounts-title"]}>Available Discounts</h2>
      <div className={styles["user-discounts-list"]}>
        {discounts.map((d) => (
          <div className={styles["user-discount-card"]} key={d.id}>
            <div className={styles["user-discount-header"]}>
              <span className={styles["user-discount-restaurant"]}>{d.restaurant}</span>
              <span className={styles["user-discount-percent"]}>{d.percent}% OFF</span>
            </div>
            <div className={styles["user-discount-details"]}>
              <span className={styles["user-discount-meal"]}>{d.meal}</span>
              <span className={styles["user-discount-time"]}>{d.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
