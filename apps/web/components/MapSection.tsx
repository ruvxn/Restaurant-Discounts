"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MapSection.module.css";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  address: string;
};

// Melbourne restaurant locations
const restaurantLocations: Restaurant[] = [
  {
    id: "1",
    name: "Sushi House",
    slug: "sushi-house",
    latitude: -37.8136,
    longitude: 144.9631,
    address: "123 Flinders Lane, Melbourne VIC 3000",
  },
  {
    id: "2",
    name: "Sunset Grill",
    slug: "sunset-grill",
    latitude: -37.8183,
    longitude: 144.9671,
    address: "456 Southbank Boulevard, Southbank VIC 3006",
  },
  {
    id: "3",
    name: "Pasta Place",
    slug: "pasta-place",
    latitude: -37.8102,
    longitude: 144.9628,
    address: "789 Collins Street, Melbourne VIC 3000",
  },
];

export default function MapSection() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    // Dynamically load Leaflet CSS and JS
    const loadLeaflet = async () => {
      // Load CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);
      }

      // Load JS
      if (!(window as any).L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";

        await new Promise((resolve) => {
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      return (window as any).L;
    };

    loadLeaflet().then((L) => {
      if (!L || mapInstanceRef.current) return;

      // Initialize map centered on Melbourne CBD
      const map = L.map(mapRef.current).setView([-37.8136, 144.9631], 14);

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom icon for restaurant markers
      const restaurantIcon = L.divIcon({
        className: styles.customMarker,
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #ff8a5c, #ff7043);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(255, 112, 67, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
              <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z"/>
            </svg>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });

      // Add markers for each restaurant
      restaurantLocations.forEach((restaurant) => {
        const marker = L.marker([restaurant.latitude, restaurant.longitude], {
          icon: restaurantIcon,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px;">
            <h3 style="margin: 0 0 8px 0; font-size: 1rem; font-weight: 600; color: #2a1209;">
              ${restaurant.name}
            </h3>
            <p style="margin: 0; font-size: 0.85rem; color: #b9603b;">
              ${restaurant.address}
            </p>
          </div>
        `);
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <section className={styles.mapSection}>
      <div className={styles.mapContent}>
        <div className={styles.mapHeader}>
          <h2 className={styles.mapTitle}>Find Us on the Map</h2>
          <p className={styles.mapSubtitle}>
            All our partner restaurants are conveniently located across Melbourne
          </p>
        </div>

        <div className={styles.mapContainer}>
          <div ref={mapRef} className={styles.mapPlaceholder}>
            {!mapLoaded && (
              <div className={styles.mapOverlay}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.loadingIcon}
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <p>Loading Map...</p>
              </div>
            )}
          </div>

          <div className={styles.locationsList}>
            {restaurantLocations.map((restaurant) => (
              <div key={restaurant.id} className={styles.locationCard}>
                <div className={styles.locationIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className={styles.locationInfo}>
                  <h3 className={styles.locationName}>{restaurant.name}</h3>
                  <p className={styles.locationAddress}>{restaurant.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
