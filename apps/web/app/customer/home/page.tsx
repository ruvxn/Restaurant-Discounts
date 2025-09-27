"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoHeart, GoHeartFill } from "react-icons/go";
import styles from "./Home.module.css";

const restaurants = [
  {
    id: 1,
    name: "Sunset Grill",
    cuisine: "Western",
    hours: "10:00am - 10:00pm",
    maxDiscount: 30,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    name: "Pasta Place",
    cuisine: "Italian",
    hours: "11:00am - 11:00pm",
    maxDiscount: 20,
    image: "https://images.pexels.com/photos/6193381/pexels-photo-6193381.jpeg?auto=compress&w=800&q=80",
  },
  {
    id: 3,
    name: "Sushi House",
    cuisine: "Japanese",
    hours: "12:00pm - 9:00pm",
    maxDiscount: 10,
    image: "https://images.pexels.com/photos/31326827/pexels-photo-31326827.jpeg?auto=compress&w=800&q=80",
  },
];

export default function Home() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <div className={styles["user-content"]}>
      <h1 className={styles["home-title"]}>HOME PAGE</h1>
      <p className={styles["home-subtitle"]}>Ready to get some discounts?</p>

      <div className={styles["restaurant-cards-row"]}>
        {restaurants.map((r) => (
          <div
            key={r.id}
            className={styles["restaurant-card"]}
            onClick={() => router.push(`/restaurant/${r.id}`)}
          >
            {/* Discount Badge */}
            <div className={styles["discount-badge"]}>Up to {r.maxDiscount}%</div>

            {/* Heart Icon */}
            <div
              className={styles["heart-icon"]}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(r.id);
              }}
            >
              {favorites.includes(r.id) ? <GoHeartFill size={20} /> : <GoHeart size={20} />}
            </div>

            <img src={r.image} alt={r.name} className={styles["restaurant-image"]} />
            <div className={styles["restaurant-info"]}>
              <h2 className={styles["restaurant-name"]}>{r.name}</h2>
              <div className={styles["restaurant-cuisine"]}>{r.cuisine}</div>
              <div className={styles["restaurant-hours"]}>{r.hours}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
