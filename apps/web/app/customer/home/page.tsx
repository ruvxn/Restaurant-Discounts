"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoHeart, GoHeartFill } from "react-icons/go";
import styles from "./Home.module.css";
import CustomerNav from "@/components/CustomerNav";
import MapSection from "@/components/MapSection";
import RegisterRestaurantCTA from "@/components/RegisterRestaurantCTA";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  open: number;
  close: number;
  googleRating: number | null;
  averageBill: number | null;
  distanceKm: number | null;
  maxDiscount?: number;
};

export default function Home() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        setLoading(true);
        const response = await fetch("/api/restaurants");

        if (!response.ok) {
          throw new Error("Failed to fetch restaurants");
        }

        const data = await response.json();
        setRestaurants(data);
      } catch (err) {
        setError("Failed to load restaurants. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRestaurants();
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const formatHours = (open: number, close: number) => {
    const formatTime = (hour: number) => {
      const period = hour >= 12 ? "pm" : "am";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:00${period}`;
    };
    return `${formatTime(open)} - ${formatTime(close)}`;
  };

  const getRestaurantImage = (slug: string) => {
    const images: Record<string, string> = {
      "sunset-grill": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      "pasta-place": "https://images.pexels.com/photos/6193381/pexels-photo-6193381.jpeg?auto=compress&w=800&q=80",
      "sushi-house": "https://images.pexels.com/photos/31326827/pexels-photo-31326827.jpeg?auto=compress&w=800&q=80",
    };
    return images[slug] || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";
  };

  const renderState = (message: string) => (
    <>
      <CustomerNav />
      <main className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.header}>
            <h1 className={styles.headerTitle}>Discover Restaurants</h1>
            <p className={styles.headerSubtitle}>Find great deals at your favorite spots</p>
          </div>
          <div className={styles.state}>{message}</div>
        </div>
      </main>
    </>
  );

  if (loading) {
    return renderState("Loading restaurants…");
  }

  if (error) {
    return renderState(error);
  }

  return (
    <>
      <CustomerNav />
      <main className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <h1 className={styles.headerTitle}>Discover restaurants</h1>
            <p className={styles.headerSubtitle}>
              Browse curated dining rooms offering generous off-peak savings, hand-picked for food lovers
              who value great experiences and smart pricing.
            </p>
          </header>

          <section className={styles.grid}>
            {restaurants.map((r) => (
              <article
                key={r.id}
                className={styles.card}
                onClick={() => router.push(`/customer/restaurant/${r.id}`)}
              >
                <div className={styles.imageWrapper}>
                  <span className={styles.discountChip}>
                    {r.maxDiscount ? `Up to ${r.maxDiscount}% off` : "See deals"}
                  </span>

                  <button
                    type="button"
                    className={styles.favoriteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(r.id);
                    }}
                    aria-label={favorites.includes(r.id) ? "Remove from favourites" : "Save to favourites"}
                  >
                    {favorites.includes(r.id) ? <GoHeartFill size={18} /> : <GoHeart size={18} />}
                  </button>

                  <img src={getRestaurantImage(r.slug)} alt={r.name} />
                </div>

                <div className={styles.body}>
                  <h2 className={styles.name}>{r.name}</h2>
                  <div className={styles.meta}>
                    {r.category && <span className={styles.category}>{r.category}</span>}
                    <span className={styles.hours}>{formatHours(r.open, r.close)}</span>
                    {r.distanceKm && <span>{r.distanceKm.toFixed(1)} km away</span>}
                  </div>
                  {r.googleRating && (
                    <div className={styles.rating}>
                      <div className={styles.stars}>
                        {[...Array(5)].map((_, i) => {
                          const fillPercentage = Math.min(Math.max(r.googleRating! - i, 0), 1) * 100;
                          return (
                            <div key={i} className={styles.starWrapper}>
                              <svg
                                className={styles.starEmpty}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              <svg
                                className={styles.starFilled}
                                style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            </div>
                          );
                        })}
                      </div>
                      <span className={styles.ratingValue}>{r.googleRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        </div>

        <MapSection />
        <RegisterRestaurantCTA />
      </main>
    </>
  );
}
