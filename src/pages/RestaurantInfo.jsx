import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/RestaurantInfo.css";

const OPENING_HOURS = "11:00am - 10:00pm";

const weekly = {
  Monday: "10:00am - 10:00pm",
  Tuesday: "10:00am - 10:00pm",
  Wednesday: "10:00am - 10:00pm",
  Thursday: "10:00am - 10:00pm",
  Friday: "10:00am - 10:00pm",
  Saturday: "10:00am - 11:00pm",
  Sunday: "10:00am - 9:00pm",
};

const sampleRestaurants = {
  1: {
    name: "Sunset Grill",
    cuisine: "Western",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    menu: [
      { name: "Steak Set", price: "21.00", originalPrice: "35.00" },
      { name: "Seafood Set", price: "20.80", originalPrice: "32.00" },
      { name: "Chicken Set", price: "21.00", originalPrice: "28.00" },
    ],
    reviews: [
      { user: "Alice", comment: "Amazing steak and cozy atmosphere!" },
      { user: "Bob", comment: "Loved the service and food." },
    ],
    weeklyHours: weekly,
    about:
      "Sunset Grill is known for its fine western cuisine and stunning sunset views from the dining hall. We pride ourselves on fresh ingredients and elegant presentation.",
  },
  2: {
    name: "Pasta Place",
    cuisine: "Italian",
    image:
      "https://images.pexels.com/photos/6193381/pexels-photo-6193381.jpeg?auto=compress&w=800&q=80",
    menu: [
      { name: "Family Pasta Set", price: "17.50", originalPrice: "25.00" },
      { name: "Couple Set", price: "14.40", originalPrice: "18.00" },
      { name: "Lunch Special", price: "11.90", originalPrice: "14.00" },
    ],
    reviews: [
      { user: "Carla", comment: "Authentic flavors and great value." },
      { user: "Dan", comment: "Carbonara was spot on!" },
    ],
    weeklyHours: weekly,
    about:
      "Pasta Place serves classic Italian dishes with a modern twist, focusing on fresh pasta and hearty sauces.",
  },
  3: {
    name: "Sushi House",
    cuisine: "Japanese",
    image:
      "https://images.pexels.com/photos/31326827/pexels-photo-31326827.jpeg?auto=compress&w=800&q=80",
    menu: [
      { name: "Teriyaki Don Set", price: "20.00", originalPrice: "25.00" },
      { name: "Salmon Nigiri", price: "13.00", originalPrice: "13.00" },
      { name: "Sushi Set Deluxe", price: "22.10", originalPrice: "34.00" },
    ],
    reviews: [
      { user: "Erin", comment: "Fresh fish and friendly staff." },
      { user: "Felix", comment: "Great lunch specials!" },
    ],
    weeklyHours: weekly,
    about:
      "Sushi House offers a curated selection of traditional and modern sushi, prioritizing freshness and quality.",
  },
};

/* ------------ Helpers ------------ */
function fmtHour(h24) {
  const ampm = h24 >= 12 ? "pm" : "am";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:00${ampm}`;
}
function buildDailyHourlySlots() {
  const slots = [];
  for (let h = 11; h <= 21; h++) {
    const a = fmtHour(h);
    const b = fmtHour(h + 1);
    slots.push(`${a}-${b}`);
  }
  return slots;
}
function randomPercent() {
  const choices = [10, 15, 20, 25, 30, 35, 40, 45, 50];
  return choices[Math.floor(Math.random() * choices.length)];
}
function normalizeSlot(s) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}
function fmtAUD(n) {
  const num = Number.isFinite(n) ? n : 0;
  return `AUD ${num.toFixed(2)}`;
}

export default function RestaurantInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const restaurant = sampleRestaurants[id];

  const [selectedSlot, setSelectedSlot] = useState("11:00am-12:00pm"); // default
  const [openList, setOpenList] = useState(false);

  const hourlySlots = useMemo(() => buildDailyHourlySlots(), []);

  // Randomized discount per hour (stable for this mount)
  const discountBySlot = useMemo(() => {
    const map = {};
    hourlySlots.forEach((slot) => {
      map[slot] = randomPercent();
    });
    return map;
  }, [hourlySlots]);

  const slotLookup = useMemo(() => {
    const m = {};
    hourlySlots.forEach((s) => (m[normalizeSlot(s)] = s));
    return m;
  }, [hourlySlots]);

  const selectedPercent = useMemo(() => {
    const key = slotLookup[normalizeSlot(selectedSlot)] || "";
    return key ? discountBySlot[key] : null;
  }, [selectedSlot, slotLookup, discountBySlot]);

  // Seating plan data
  const seatingItems = useMemo(
    () => [
      { id: "entrance", type: "entrance", top: "88%", left: "6%", label: "Entrance" },
      { id: "cashier", type: "cashier", top: "12%", left: "90%", label: "Cashier" },
      // 8 tables: 2 occupied (cap 12), rest cap 4–6
      { id: "T1", type: "table", top: "16%", left: "14%", capacity: 5, occupied: 0 },
      { id: "T2", type: "table", top: "22%", left: "48%", capacity: 4, occupied: 0 },
      { id: "T3", type: "table", top: "34%", left: "26%", capacity: 6, occupied: 0 },
      { id: "T4", type: "table", top: "30%", left: "74%", capacity: 5, occupied: 0 },
      { id: "T5", type: "table", top: "58%", left: "16%", capacity: 12, occupied: 12 }, // occupied
      { id: "T6", type: "table", top: "56%", left: "56%", capacity: 6, occupied: 0 },
      { id: "T7", type: "table", top: "72%", left: "78%", capacity: 12, occupied: 12 }, // occupied
      { id: "T8", type: "table", top: "40%", left: "52%", capacity: 4, occupied: 0 },
    ],
    []
  );

  const [selectedTable, setSelectedTable] = useState(null);

  // Dropdown: outside click / Esc close
  const comboboxRef = useRef(null);
  useEffect(() => {
    function handleDocClick(e) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setOpenList(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpenList(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  if (!restaurant) return <div style={{ padding: "2rem" }}>Restaurant not found.</div>;

  const handleToggleList = () => setOpenList((v) => !v);
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setOpenList(false);
  };

  return (
    <div className="restaurant-info-page">
      {/* LEFT COLUMN */}
      <aside className="restaurant-card-left">
        <img src={restaurant.image} alt={restaurant.name} className="restaurant-image-large" />
        <h2 className="restaurant-name">{restaurant.name}</h2>
        <div className="restaurant-cuisine">{restaurant.cuisine}</div>
        <div className="restaurant-hours-today">{OPENING_HOURS}</div>

        <div className="available-discounts">
          <h4>Today's Discounts</h4>
          <div className="discount-combobox" ref={comboboxRef}>
            <div className="combobox-inner">
              <div
                className="dropdown-display"
                role="button"
                tabIndex={0}
                onClick={handleToggleList}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleToggleList()}
                aria-haspopup="listbox"
                aria-expanded={openList}
              >
                {selectedSlot}
              </div>
              <button
                type="button"
                className="time-button"
                aria-haspopup="listbox"
                aria-expanded={openList}
                aria-label="Open time slots"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleToggleList}
              >
                ▾
              </button>
              {openList && (
                <div className="time-dropdown" role="listbox">
                  {hourlySlots.map((slot) => (
                    <div
                      key={slot}
                      role="option"
                      aria-selected={normalizeSlot(selectedSlot) === normalizeSlot(slot)}
                      className={
                        "time-option" +
                        (normalizeSlot(selectedSlot) === normalizeSlot(slot) ? " selected" : "")
                      }
                      onClick={() => handleSelectSlot(slot)}
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="discount-percent-badge">
            {selectedPercent != null ? `${selectedPercent}%` : "—"}
          </div>
        </div>

        <button className="booking-next-button" onClick={() => navigate(`/menu/${id}`)}>
          Menu
        </button>
      </aside>

      {/* RIGHT COLUMN */}
      <div className="restaurant-content-right">
        {/* Set Menu */}
        <section className="info-section">
          <h3 className="section-title">Set menu</h3>
          <ul className="menu-list">
            {restaurant.menu.map((item, idx) => {
              const base = parseFloat(item.originalPrice ?? item.price ?? 0) || 0;
              const pct = selectedPercent ?? 0;
              const discounted = base * (1 - pct / 100);
              return (
                <li key={idx} className="menu-item">
                  <span className="menu-name">{item.name}</span>
                  <div className="menu-price-wrapper">
                    <span className="discounted-price">{fmtAUD(discounted)}</span>
                    <span className="original-price">{fmtAUD(base)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Seating plan */}
        <section className="info-section">
          <h3 className="section-title">Seating plan</h3>
          <div className="seating-floor">
            {seatingItems.map((item) => {
              if (item.type === "table") {
                const isOccupied = item.occupied >= item.capacity;
                return (
                  <button
                    key={item.id}
                    className={"seat-item seat-table" + (isOccupied ? " occupied" : " available")}
                    style={{ top: item.top, left: item.left }}
                    onClick={() => setSelectedTable(item)}
                    aria-label={`Table ${item.id}, capacity ${item.capacity}, ${
                      isOccupied ? "occupied" : "available"
                    }`}
                  >
                    <span className="seat-label">{item.id}</span>
                  </button>
                );
              }
              if (item.type === "entrance") {
                return (
                  <div
                    key={item.id}
                    className="seat-item entrance"
                    style={{ top: item.top, left: item.left }}
                    aria-hidden="true"
                  >
                    <span className="seat-label">In</span>
                  </div>
                );
              }
              return (
                <div
                  key={item.id}
                  className="seat-item cashier"
                  style={{ top: item.top, left: item.left }}
                  aria-hidden="true"
                >
                  <span className="seat-label">$</span>
                </div>
              );
            })}
          </div>

          {selectedTable && (
            <div className="modal-overlay" onClick={() => setSelectedTable(null)}>
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="modal-title">Table {selectedTable.id}</h4>
                <div className="modal-body">
                  <p>
                    <strong>Capacity:</strong> {selectedTable.capacity}
                  </p>
                  <p>
                    <strong>Occupied:</strong>{" "}
                    {Math.min(selectedTable.occupied, selectedTable.capacity)}/
                    {selectedTable.capacity}
                  </p>
                  <p>
                    <strong>Event:</strong> N/A
                  </p>
                </div>
                <div className="modal-actions">
                  <button className="btn" onClick={() => setSelectedTable(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* About */}
        <section className="info-section">
          <h3 className="section-title">About</h3>
          <p className="about-text">
            {restaurant.about && restaurant.about.trim().length > 0
              ? restaurant.about
              : "No additional information provided."}
          </p>

          {/* Opening hours list (replaces 'Weekly Opening Hours' section) */}
          <div className="about-hours-block">
            <p className="about-hours-title">Opening hours:</p>
            <ul className="about-hours-list">
              {Object.entries(restaurant.weeklyHours ?? weekly).map(([day, hours]) => (
                <li key={day}>
                  <span className="day">{day}:</span> <span className="hours">{hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}