"use client";

import { useState, useEffect, useRef, WheelEvent } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import CustomerNav from "@/components/CustomerNav";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import SeatingSelector from "@/components/SeatingSelector";
import type { Table as SeatingSelectorTable } from "@/components/SeatingSelector";
import { getEarliestBookableDate, formatDateLocal } from "@/src/lib/time";
import styles from "../Restaurant.module.css";

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  isSetMenu: boolean;
};

type Table = {
  id: number;
  label: string;
  seatingCap: number;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  open: number;
  close: number;
  totalSeats: number;
  googleRating: number | null;
  averageBill: number | null;
  distanceKm: number | null;
  tables: Table[];
  menuItems: MenuItem[];
};

type Discount = {
  hour: number;
  discountPercentage: number;
};

type TimeSlot = {
  hour: number;
  discount: number;
  availableSeats: number | null;
};

export default function RestaurantDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isLoggedIn, role, initializing } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // OLD: const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // NEW: Initialize with earliest bookable date (always today, allowing booking before opening hours)
  const [selectedDate, setSelectedDate] = useState<Date>(getEarliestBookableDate());
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedSetMenu, setSelectedSetMenu] = useState<number | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [capacityTables, setCapacityTables] = useState<SeatingSelectorTable[]>([]);
  const [loadingCapacity, setLoadingCapacity] = useState(false);

  useEffect(() => {
    async function fetchRestaurantData() {
      try {
        setLoading(true);

        const restaurantResponse = await fetch(`/api/restaurants/${resolvedParams.id}`);
        if (!restaurantResponse.ok) {
          throw new Error("Restaurant not found");
        }
        const restaurantData = await restaurantResponse.json();
        setRestaurant(restaurantData);

        const discountsResponse = await fetch(`/api/restaurants/${resolvedParams.id}/discounts`);
        if (discountsResponse.ok) {
          const discountsData = await discountsResponse.json();
          setDiscounts(discountsData.discounts ?? []);
        }
      } catch (err) {
        setError("Failed to load restaurant details. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRestaurantData();
  }, [resolvedParams.id]);

  useEffect(() => {
    if (!restaurant) return;

    async function fetchAvailability() {
      const slots: TimeSlot[] = [];

      for (const discount of discounts) {
        try {
          const response = await fetch(
            `/api/restaurants/${resolvedParams.id}/availability?date=${selectedDate.toISOString()}&hour=${discount.hour}`,
            { cache: 'no-store' }
          );
          if (response.ok) {
            const data = await response.json();
            slots.push({
              hour: discount.hour,
              discount: discount.discountPercentage,
              availableSeats: data.availableSeats,
            });
          }
        } catch (err) {
          console.error(`Failed to fetch availability for hour ${discount.hour}:`, err);
          slots.push({
            hour: discount.hour,
            discount: discount.discountPercentage,
            availableSeats: null,
          });
        }
      }

      slots.sort((a, b) => a.hour - b.hour);
      setTimeSlots(slots);

      // Auto-select current time or closest future time (only if no slot is selected yet)
      if (slots.length > 0) {
        const now = new Date();
        const currentHour = now.getHours();

        // Find the current or next available time slot
        const currentOrNextSlot = slots.find(slot => slot.hour >= currentHour) || slots[0];

        // Always set to current/next time slot when time slots are loaded for the first time
        setSelectedSlot(currentOrNextSlot);
      }
    }

    if (discounts.length > 0) {
      fetchAvailability();
    }
  }, [selectedDate, discounts, restaurant, resolvedParams.id]);

  // Fetch table capacity data for SeatingSelector
  useEffect(() => {
    if (!selectedSlot || !restaurant) return;

    async function fetchCapacity() {
      setLoadingCapacity(true);
      try {
        // OLD: const dateParam = selectedDate.toISOString().split('T')[0];
        // NEW: Use formatDateLocal to avoid timezone conversion issues
        const dateParam = formatDateLocal(selectedDate);
        const response = await fetch(
          `/api/restaurants/${resolvedParams.id}/capacity?date=${dateParam}&hour=${selectedSlot.hour}`,
          { cache: 'no-store' }
        );

        if (response.ok) {
          const data = await response.json();
          const transformedTables: SeatingSelectorTable[] = data.tables.map((table: any) => ({
            id: table.id,
            label: table.label,
            totalCapacity: table.totalCapacity,
            availableSeats: table.availableSeats,
            bookedSeats: table.bookedSeats,
            isAvailable: table.isAvailable,
            occupancyRate: table.occupancyRate,
            menuLocked: table.menuLocked || false,
            lockKey: table.lockKey || null,
            lockMenuName: table.lockMenuName || null,
          }));
          setCapacityTables(transformedTables);
        }
      } catch (err) {
        console.error('Error fetching capacity:', err);
      } finally {
        setLoadingCapacity(false);
      }
    }

    fetchCapacity();
  }, [selectedSlot, selectedDate, restaurant, resolvedParams.id]);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  // Calculate discounted price based on current selected slot
  const calculateDiscountedPrice = (cents: number) => {
    if (!selectedSlot) return cents;
    const discountAmount = (cents * selectedSlot.discount) / 100;
    return cents - discountAmount;
  };

  const formatDiscountedPrice = (cents: number) => {
    const discounted = calculateDiscountedPrice(cents);
    return formatPrice(discounted);
  };

  // OLD: const selectedDateValue = selectedDate.toISOString().split("T")[0];
  // NEW: Use formatDateLocal to avoid timezone conversion issues
  const selectedDateValue = formatDateLocal(selectedDate);

  const setMenuItems = restaurant?.menuItems.filter(item => item.isSetMenu) || [];

  const parseMenuIdFromLockKey = (lockKey: string | null | undefined): number | null => {
    if (!lockKey) return null;
    if (!lockKey.startsWith('menu_')) return null;
    const numericPart = Number(lockKey.replace('menu_', ''));
    return Number.isNaN(numericPart) ? null : numericPart;
  };

  const currentDiscount = selectedSlot?.discount || 0;

  // Scroll state update
  const updateScrollState = () => {
    const node = scrollContainerRef.current;
    if (!node) return;
    setCanScrollLeft(node.scrollLeft > 0);
    setCanScrollRight(node.scrollLeft < node.scrollWidth - node.clientWidth - 1);
  };

  // Debounced scroll state update
  const scheduleScrollStateUpdate = () => {
    requestAnimationFrame(() => updateScrollState());
  };

  // Wheel event handler for horizontal scrolling
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    const node = event.currentTarget;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    const target = Math.max(0, Math.min(maxScroll, node.scrollLeft + event.deltaY));
    node.scrollTo({ left: target, behavior: "smooth" });
    scheduleScrollStateUpdate();
  };

  // Manual scroll functions
  const scrollLeft = () => {
    const node = scrollContainerRef.current;
    if (!node) return;
    node.scrollBy({ left: -200, behavior: "smooth" });
    scheduleScrollStateUpdate();
  };

  const scrollRight = () => {
    const node = scrollContainerRef.current;
    if (!node) return;
    node.scrollBy({ left: 200, behavior: "smooth" });
    scheduleScrollStateUpdate();
  };

  // Update scroll state on mount and when time slots change
  useEffect(() => {
    updateScrollState();
    const node = scrollContainerRef.current;
    if (node) {
      node.addEventListener('scroll', scheduleScrollStateUpdate);
      return () => node.removeEventListener('scroll', scheduleScrollStateUpdate);
    }
  }, [timeSlots]);

  // Auto-scroll to selected slot
  useEffect(() => {
    if (selectedSlot && scrollContainerRef.current) {
      const selectedElement = scrollContainerRef.current.querySelector(`[data-hour="${selectedSlot.hour}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedSlot]);

  const handleReservation = async () => {
    // Check auth before proceeding
    if (!isLoggedIn || role !== "CUSTOMER") {
      toast.error("Please log in to make a reservation");
      const currentPath = `/customer/restaurant/${resolvedParams.id}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }

    if (!selectedSetMenu) {
      toast.error("Please select a set menu");
      return;
    }

    if (!selectedTable) {
      toast.error("Please select a table");
      return;
    }

    setBookingInProgress(true);

    try {
      const menuItemsPayload = [{
        menuItemId: selectedSetMenu,
        quantity: partySize, // Use party size as quantity (1 set menu per person)
      }];

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: restaurant?.id,
          bookingDate: selectedDate.toISOString(),
          bookingTime: selectedSlot.hour,
          partySize,
          menuItems: menuItemsPayload,
          tableId: selectedTable?.id, // Include selected table ID
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle auth errors specifically
        if (response.status === 401 || response.status === 403) {
          toast.error('Please log in to complete your booking');
          const currentPath = `/customer/restaurant/${resolvedParams.id}`;
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
          return;
        }

        // Handle duplicate booking (409 Conflict)
        if (response.status === 409) {
          const message = data?.error || 'You already have a booking at this time';
          toast.error(message, {
            duration: 5000,
            action: {
              label: 'View Bookings',
              onClick: () => router.push('/customer/bookings')
            }
          });
          return;
        }

        const message = data?.error || 'Failed to create booking';
        toast.error(message);
        return;
      }

      toast.success('Reservation confirmed!');
      router.push(`/customer/booking/${data.booking.id}/confirmation`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create reservation. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading || initializing) {
    return (
      <>
        <CustomerNav />
        <main className={styles.page}>
          <div className={styles.inner}>Loading restaurant…</div>
        </main>
      </>
    );
  }

  if (error || !restaurant) {
    return (
      <>
        <CustomerNav />
        <main className={styles.page}>
          <div className={styles.inner}>
            <button className={styles.backButton} onClick={() => router.push("/customer/home")}>
              ← Back to restaurants
            </button>
            <div style={{ color: "#ef4444" }}>{error || "Restaurant not found"}</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <CustomerNav />
      <main className={styles.page}>
        <div className={styles.inner}>
          <button className={styles.backButton} onClick={() => router.push("/customer/home")}>
            ← Back to restaurants
          </button>

          <header className={styles.header}>
            <h1 className={styles.title}>{restaurant.name}</h1>
            <div className={styles.metaLine}>
              {restaurant.category && <span>{restaurant.category}</span>}
              <span>
                {formatTime(restaurant.open)} – {formatTime(restaurant.close)}
              </span>
              {restaurant.distanceKm && <span>{restaurant.distanceKm.toFixed(1)} km away</span>}
            </div>
            {restaurant.googleRating && (
              <span className={styles.rating}>⭐ {restaurant.googleRating.toFixed(1)} Rated</span>
            )}
            {restaurant.averageBill && <span>Average bill ${restaurant.averageBill.toFixed(0)}</span>}
          </header>

          <div className={styles.layout}>
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>Make a Reservation</h2>

              {/* Step 1: Date Selection */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label className={styles.label} htmlFor="booking-date">
                  1. Select date
                </label>
                <input
                  id="booking-date"
                  type="date"
                  className={styles.dateInput}
                  value={selectedDateValue}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  min={formatDateLocal(getEarliestBookableDate())}
                />
              </div>

              {/* Step 2: Time Selection */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label className={styles.label}>2. Choose a time</label>

                {/* Current Selected Time Display */}
                {selectedSlot && (
                  <div style={{
                    padding: "1.5rem",
                    border: "2px solid #3b82f6",
                    borderRadius: "0.75rem",
                    backgroundColor: "#eff6ff",
                    marginBottom: "1rem",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                          {formatTime(selectedSlot.hour)}
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: "600", color: "#10b981" }}>
                          {selectedSlot.discount}% discount applied
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Available Seats</div>
                        <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>
                          {selectedSlot.availableSeats !== null ? selectedSlot.availableSeats : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Horizontal Scroll Time Slots */}
                <div style={{ position: "relative" }}>
                  {/* Left Scroll Button */}
                  {canScrollLeft && (
                    <button
                      type="button"
                      onClick={scrollLeft}
                      style={{
                        position: "absolute",
                        left: "0",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        backgroundColor: "white",
                        border: "2px solid #e5e7eb",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                      aria-label="Scroll left"
                    >
                      ←
                    </button>
                  )}

                  {/* Scrollable Container */}
                  <div
                    ref={scrollContainerRef}
                    onWheel={handleWheel}
                    onScroll={scheduleScrollStateUpdate}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      overflowX: "auto",
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #e5e7eb",
                      backgroundColor: "white",
                      scrollbarWidth: "none", // Firefox
                      msOverflowStyle: "none", // IE/Edge
                    }}
                    role="group"
                    aria-label="Available time slots"
                  >
                    <style jsx>{`
                      div::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    {timeSlots.map((slot) => {
                      const isSelected = selectedSlot?.hour === slot.hour;
                      return (
                        <button
                          key={slot.hour}
                          type="button"
                          data-hour={slot.hour}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setSelectedTable(null);
                          }}
                          style={{
                            minWidth: "140px",
                            padding: "0.75rem 1rem",
                            border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
                            borderRadius: "0.5rem",
                            backgroundColor: isSelected ? "#eff6ff" : "white",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: "0.25rem",
                          }}
                        >
                          <div style={{ fontWeight: "600", color: "#111827", fontSize: "1rem" }}>
                            {formatTime(slot.hour)}
                          </div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#10b981" }}>
                            {slot.discount}% off
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            {slot.availableSeats !== null
                              ? `${slot.availableSeats} seats`
                              : "N/A"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Scroll Button */}
                  {canScrollRight && (
                    <button
                      type="button"
                      onClick={scrollRight}
                      style={{
                        position: "absolute",
                        right: "0",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        backgroundColor: "white",
                        border: "2px solid #e5e7eb",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                      aria-label="Scroll right"
                    >
                      →
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3: Party Size */}
              {selectedSlot && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label className={styles.label} htmlFor="party-size">
                    3. Party size
                  </label>
                  <select
                    id="party-size"
                    className={styles.dateInput}
                    value={partySize}
                    onChange={(e) => {
                      setPartySize(parseInt(e.target.value));
                      setSelectedTable(null); // Reset table when party size changes
                    }}
                  >
                    {[...Array(12)].map((_, index) => {
                      const size = index + 1;
                      return (
                        <option key={size} value={size}>
                          {size} {size === 1 ? 'Guest' : 'Guests'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Step 4: Interactive Table Selection */}
              {selectedSlot && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label className={styles.label}>
                    4. Select a table (interactive floorplan)
                  </label>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
                    Hover over tables to see current guests and their interests. Click to select.
                  </p>

                  {loadingCapacity ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "0.5rem" }}>
                      Loading table availability...
                    </div>
                  ) : capacityTables.length > 0 ? (
                    <SeatingSelector
                      restaurantId={Number(resolvedParams.id)}
                      date={formatDateLocal(selectedDate)}
                      hour={selectedSlot.hour}
                      tables={capacityTables}
                      selectedTableId={selectedTable?.id}
                      onTableSelect={(table) => {
                        const tableLockMenuId = parseMenuIdFromLockKey(table.lockKey);

                        if (table.menuLocked) {
                          if (!tableLockMenuId) {
                            toast.error('This table is currently locked to a specific menu. Please select the required set menu to continue.');
                            return;
                          }

                          if (!selectedSetMenu) {
                            const lockedName = restaurant?.menuItems.find(item => item.id === tableLockMenuId)?.name || `Menu ${tableLockMenuId}`;
                            toast.error(`This table is reserved for ${lockedName}. Select that menu before choosing the table.`);
                            return;
                          }

                          if (selectedSetMenu !== tableLockMenuId) {
                            const lockedName = restaurant?.menuItems.find(item => item.id === tableLockMenuId)?.name || `Menu ${tableLockMenuId}`;
                            toast.error(`This table is reserved for ${lockedName}. Please switch your selection to match.`);
                            return;
                          }
                        }

                        const originalTable = restaurant?.tables.find(t => t.id === table.id);
                        if (originalTable) {
                          setSelectedTable(originalTable);
                        }
                      }}
                    />
                  ) : (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "0.5rem" }}>
                      No tables available for this time slot.
                    </div>
                  )}
                </div>
              )}

              {/* Reserve Button */}
              {selectedSlot && (
                <>
                  {!isLoggedIn || role !== "CUSTOMER" ? (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{
                        padding: "1rem",
                        backgroundColor: "#fef3c7",
                        borderRadius: "0.5rem",
                        marginBottom: "0.75rem",
                        border: "1px solid #fbbf24"
                      }}>
                        <p style={{ fontSize: "0.875rem", color: "#92400e", textAlign: "center" }}>
                          🔒 Please log in to complete your reservation
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.bookButton}
                        onClick={() => {
                          const currentPath = `/customer/restaurant/${resolvedParams.id}`;
                          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
                        }}
                      >
                        Log in to Reserve
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.bookButton}
                      disabled={!selectedTable || !selectedSetMenu || bookingInProgress}
                      onClick={handleReservation}
                    >
                      {bookingInProgress ? "Processing..." : "Reserve Table"}
                    </button>
                  )}
                </>
              )}
            </section>

            <aside className={styles.card}>
              <h2 className={styles.sectionTitle}>Set Menu Options</h2>
              {selectedSlot && (
                <div style={{
                  padding: "0.75rem",
                  backgroundColor: "#ecfdf5",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                  border: "1px solid #10b981"
                }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#047857" }}>
                    🎉 {currentDiscount}% discount applied to all prices below
                  </div>
                </div>
              )}
              {!selectedSlot ? (
                <p style={{ color: "#6b7280", fontSize: "0.875rem", padding: "1rem 0" }}>
                  Loading time slots...
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {setMenuItems.length > 0 ? (
                    setMenuItems.map((item) => {
                      const isSelected = selectedSetMenu === item.id;
                      const originalPrice = item.priceCents;
                      const discountedPrice = calculateDiscountedPrice(originalPrice);
                      const savings = originalPrice - discountedPrice;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedSetMenu(item.id)}
                          style={{
                            padding: "1rem",
                            border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
                            borderRadius: "0.5rem",
                            backgroundColor: isSelected ? "#eff6ff" : "white",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "600", color: "#111827", fontSize: "1rem", marginBottom: "0.25rem" }}>
                                {item.name}
                              </div>
                              {item.description && (
                                <div style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: "1.5", marginBottom: "0.5rem" }}>
                                  {item.description}
                                </div>
                              )}
                              {currentDiscount > 0 && (
                                <div style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "600" }}>
                                  Save {formatPrice(savings)}
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: "700", color: "#111827", fontSize: "1.25rem", whiteSpace: "nowrap" }}>
                                {formatDiscountedPrice(item.priceCents)}
                              </div>
                              {currentDiscount > 0 && (
                                <div style={{
                                  fontSize: "0.875rem",
                                  color: "#9ca3af",
                                  textDecoration: "line-through",
                                  marginTop: "0.25rem"
                                }}>
                                  {formatPrice(originalPrice)}
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#3b82f6", fontWeight: "600" }}>
                              ✓ Selected
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p style={{ color: "#6b7280", fontSize: "0.875rem", padding: "1rem 0" }}>
                      No set menus available for this restaurant
                    </p>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
