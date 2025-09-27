"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import styles from "./RestaurantInfo.module.css";

// --------------------
// 1. Define Types
// --------------------
interface MenuItem {
  name: string;
  price: string;
  originalPrice: string;
}

interface Review {
  user: string;
  comment: string;
}

interface Discount {
  time: string;
  percent?: number;
  discount?: number;
}

interface Restaurant {
  name: string;
  cuisine: string;
  hoursToday: string;
  weeklyHours: Record<string, string>;
  image: string;
  menu: MenuItem[];
  reviews: Review[];
  discounts: Discount[];
  about: string;
}

// --------------------
// 2. Sample Data
// --------------------
const sampleRestaurants: Record<string, Restaurant> = {
  "1": {
    name: "Sunset Grill",
    cuisine: "Western",
    hoursToday: "10:00am - 10:00pm",
    weeklyHours: {
      Monday: "10:00am - 10:00pm",
      Tuesday: "10:00am - 10:00pm",
      Wednesday: "10:00am - 10:00pm",
      Thursday: "10:00am - 10:00pm",
      Friday: "10:00am - 10:00pm",
      Saturday: "10:00am - 11:00pm",
      Sunday: "10:00am - 9:00pm",
    },
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    menu: [
      { name: "Steak Set", price: "21.00", originalPrice: "35.00" },
      { name: "Seafood Set", price: "20.80", originalPrice: "32.00" },
      { name: "Chicken Set", price: "21.00", originalPrice: "28.00" },
    ],
    reviews: [
      { user: "Alice", comment: "Amazing steak and cozy atmosphere!" },
      { user: "Bob", comment: "Loved the service and food." },
    ],
    discounts: [
      { time: "11:00am - 12:00pm", percent: 10 },
      { time: "2:00pm - 3:00pm", percent: 20 },
      { time: "6:00pm - 8:00pm", percent: 30 },
    ],
    about:
      "Sunset Grill is known for its fine western cuisine and stunning sunset views from the dining hall. We pride ourselves on fresh ingredients and elegant presentation.",
  },
};

// --------------------
// 3. Smaller Components
// --------------------
const MenuList: React.FC<{ menu: MenuItem[] }> = ({ menu }) => (
  <ul className={styles["menu-list"]}>
    {menu.map((item, idx) => (
      <li key={idx} className={styles["menu-item"]}>
        <span className={styles["menu-name"]}>{item.name}</span>
        <div className={styles["menu-price-wrapper"]}>
          <span className={styles["discounted-price"]}>AUD {item.price}</span>
          <span className={styles["original-price"]}>AUD {item.originalPrice}</span>
        </div>
      </li>
    ))}
  </ul>
);

const ReviewsList: React.FC<{ reviews: Review[] }> = ({ reviews }) => (
  <ul className={styles["review-list"]}>
    {reviews.map((review, idx) => (
      <li key={idx} className={styles["review-item"]}>
        <strong>{review.user}:</strong> <span>{review.comment}</span>
      </li>
    ))}
  </ul>
);

const AboutSection: React.FC<{ about: string; weeklyHours: Record<string, string> }> = ({
  about,
  weeklyHours,
}) => (
  <>
    <p className={styles["about-text"]}>{about}</p>
    <div className={styles["weekly-hours"]}>
      <h4>Weekly Opening Hours</h4>
      <ul>
        {Object.entries(weeklyHours).map(([day, hours]) => (
          <li key={day}>
            <strong>{day}:</strong> {hours}
          </li>
        ))}
      </ul>
    </div>
  </>
);

// --------------------
// 4. Main Page
// --------------------
export default function RestaurantInfoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { id } = params;

  const restaurant = sampleRestaurants[id];
  const menuRef = useRef<HTMLDivElement>(null);

  const [people, setPeople] = useState(2);
  const [date, setDate] = useState("");
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);
  const [liveDiscounts, setLiveDiscounts] = useState<Discount[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "";
        const res = await fetch(`${base}/api/restaurants/${id}/discounts`);
        const data = await res.json();
        setLiveDiscounts(data?.discounts ?? []);
      } catch (e) {
        console.error("Failed to load discounts", e);
        setLiveDiscounts([]);
      }
    }
    if (id) load();
  }, [id]);

  const toRange = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const endH = (h + 1) % 24;
    const fmt = (H: number, M: number) => {
      const ampm = H < 12 ? "am" : "pm";
      const h12 = ((H + 11) % 12) + 1;
      return `${h12}:${String(M).padStart(2, "0")}${ampm}`;
    };
    return `${fmt(h, m)} - ${fmt(endH, m)}`;
  };

  const slots = (liveDiscounts.length ? liveDiscounts : restaurant?.discounts || []).map(
    (d) => {
      const discount = d.discount ?? d.percent;
      const is24h = typeof d.time === "string" && d.time.length === 5;
      const label = is24h ? toRange(d.time) : d.time;
      return { discount, label, time: d.time };
    }
  );

  if (!restaurant) return <div>Restaurant not found.</div>;

  return (
    <div className={styles["restaurant-info-page"]}>
      {/* Left Info Card */}
      <div className={styles["restaurant-card-left"]}>
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className={styles["restaurant-image-large"]}
        />
        <h2 className={styles["restaurant-name"]}>{restaurant.name}</h2>
        <div className={styles["restaurant-cuisine"]}>{restaurant.cuisine}</div>
        <div className={styles["restaurant-hours-today"]}>{restaurant.hoursToday}</div>

        {/* Booking Form */}
        <div className={styles["booking-form"]}>
          <label>
            Number of People:
            <input
              type="number"
              min={1}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
            />
          </label>
          <label>
            Date and Time:
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {/* Discount Buttons */}
          <div className={styles["available-discounts"]}>
            <h4>Today's Available Discounts</h4>
            <div className={styles["discount-buttons"]}>
              {(liveDiscounts.length ? liveDiscounts : restaurant.discounts).map(
                (discount, idx) => {
                  const percent = discount.percent ?? discount.discount;
                  const label =
                    discount.time.includes(":") && discount.time.length === 5
                      ? toRange(discount.time)
                      : discount.time;
                  return (
                    <button
                      key={idx}
                      className={`${styles["discount-button"]} ${
                        selectedDiscount === idx ? styles["selected"] : ""
                      }`}
                      onClick={() => setSelectedDiscount(idx)}
                    >
                      {label} - {percent}%
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <button
            className={styles["booking-next-button"]}
            onClick={() => {
              const selectedSlot =
                selectedDiscount != null ? slots[selectedDiscount] : null;
              router.push(
                `/menu/${id}?slot=${encodeURIComponent(JSON.stringify(selectedSlot))}`
              );
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Right Info Sections */}
      <div className={styles["restaurant-content-right"]}>
        <section className={styles["info-section"]} ref={menuRef}>
          <h3 className={styles["section-title"]}>Set Menu</h3>
          <MenuList menu={restaurant.menu} />
        </section>

        <section className={styles["info-section"]}>
          <h3 className={styles["section-title"]}>Reviews</h3>
          <ReviewsList reviews={restaurant.reviews} />
        </section>

        <section className={styles["info-section"]}>
          <h3 className={styles["section-title"]}>About</h3>
          <AboutSection about={restaurant.about} weeklyHours={restaurant.weeklyHours} />
        </section>
      </div>
    </div>
  );
}
