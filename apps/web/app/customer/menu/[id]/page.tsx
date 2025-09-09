"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

// Fake data (you’d normally fetch from an API or DB)
const restaurantMenus: Record<
  string,
  { name: string; menu: any[] }
> = {
  1: {
    name: "Sunset Grill Set",
    menu: [
      {
        name: "Steak Set",
        price: 21.0,
        originalPrice: 35.0,
        discount: 40,
        time: "4pm - 6pm",
        img: "https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&w=400&h=200&fit=crop",
      },
      {
        name: "Seafood Set",
        price: 20.8,
        originalPrice: 32.0,
        discount: 35,
        time: "6pm - 8pm",
        img: "https://images.pexels.com/photos/566345/pexels-photo-566345.jpeg?auto=compress&w=400&h=200&fit=crop",
      },
    ],
  },
  2: {
    name: "Pasta Place",
    menu: [
      {
        name: "Family Pasta Set",
        price: 17.5,
        originalPrice: 25,
        discount: 30,
        time: "5pm - 7pm",
        img: "https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&w=400&h=200&fit=crop",
      },
    ],
  },
};

export default function MenuPage() {
  const router = useRouter();
  const params = useParams(); // { id: "1" }
  const searchParams = useSearchParams();

  const id = params?.id as string;
  const data = restaurantMenus[id];

  // If a discount is passed in query (?discount=50&label=Happy+Hour)
  const appliedDiscount = searchParams.get("discount")
    ? Number(searchParams.get("discount"))
    : null;
  const appliedLabel = searchParams.get("label");

  const items = useMemo(() => {
    if (!data) return [];

    return data.menu.map((item) => {
      if (!appliedDiscount || appliedDiscount <= 0) return item;

      const base =
        typeof item.originalPrice === "number"
          ? item.originalPrice
          : Number(item.price);
      const newPrice = Math.round(base * (1 - appliedDiscount / 100) * 100) / 100;

      return {
        ...item,
        originalPrice: base,
        price: newPrice,
        discount: appliedDiscount,
        time: appliedLabel || item.time,
      };
    });
  }, [data, appliedDiscount, appliedLabel]);

  if (!data) return <div style={{ padding: "2rem" }}>Restaurant not found.</div>;

  return (
    <div className="user-content">
      <button
        onClick={() => router.back()}
        style={{
          marginBottom: "1.2rem",
          background: "#ff512f",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "0.5rem 1rem",
          cursor: "pointer",
          fontSize: "1.12rem",
        }}
      >
        ← Back
      </button>

      <h2
        style={{
          fontWeight: 700,
          fontSize: "2.5rem",
          color: "#181818",
          marginBottom: "1rem",
        }}
      >
        {data.name} Menu
      </h2>

      {appliedDiscount && (
        <div
          style={{
            marginBottom: "1.2rem",
            padding: "10px 14px",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 10px rgba(221,36,118,.06)",
          }}
        >
          Showing prices for <strong>{appliedLabel || "selected time"}</strong> —{" "}
          <strong>{appliedDiscount}% OFF</strong>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: "#fff",
              borderRadius: "18px",
              boxShadow: "0 2px 10px rgba(221, 36, 118, 0.09)",
              padding: "1.2rem 1.4rem",
              minWidth: "240px",
              maxWidth: "260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <img
              src={item.img}
              alt={item.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://via.placeholder.com/400x200?text=No+Image";
              }}
              style={{
                width: "100%",
                height: "110px",
                objectFit: "cover",
                borderRadius: "12px",
                marginBottom: "1rem",
              }}
            />
            <div style={{ width: "100%" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  color: "#5d005d",
                }}
              >
                {item.name}
              </div>

              <div
                style={{
                  margin: "0.3rem 0",
                  color: "#181818",
                  fontSize: "1rem",
                }}
              >
                {item.discount ? (
                  <>
                    <span
                      style={{
                        textDecoration: "line-through",
                        color: "#888",
                        marginRight: 8,
                      }}
                    >
                      AUD {Number(item.originalPrice).toFixed(2)}
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      AUD {Number(item.price).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>AUD {Number(item.price).toFixed(2)}</>
                )}
              </div>

              {item.discount && (
                <div
                  style={{
                    color: "#dd2476",
                    fontWeight: 500,
                    fontSize: "0.98rem",
                  }}
                >
                  {item.discount}% OFF
                  <span
                    style={{
                      fontWeight: 400,
                      color: "#8a8a8a",
                      marginLeft: "0.6rem",
                      fontSize: "0.93rem",
                    }}
                  >
                    ({item.time})
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
