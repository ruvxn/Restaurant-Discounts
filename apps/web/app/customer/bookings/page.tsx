'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CustomerNav from '@/components/CustomerNav';
import { useAuth } from '@/context/AuthContext';
import styles from './Bookings.module.css';

interface BookingItem {
  id: number;
  quantity: number;
  notes?: string | null;
  menuItem: {
    id: number;
    name: string;
    price: number;
  };
}

interface BookingSummary {
  id: number;
  status: 'BOOKED' | 'COMPLETED' | 'CANCELLED';
  startsAt: string;
  endsAt: string;
  partySize: number;
  discountPercent: number;
  originalTotal: number;
  discountedTotal: number;
  restaurant: {
    id: number;
    name: string;
    category?: string | null;
  };
  cancelledAt?: string | null;
  items: BookingItem[];
}

interface BookingsData {
  upcoming: BookingSummary[];
  past: BookingSummary[];
  totalBookings: number;
  totalSavings: number;
}

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const hour = date.getHours();
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export default function BookingsPage() {
  const router = useRouter();
  const { user, isLoggedIn, role, initializing } = useAuth();
  const [bookings, setBookings] = useState<BookingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBookings() {
      // Wait for auth to initialize
      if (initializing) return;

      // Check if user is logged in as customer
      if (!isLoggedIn || role !== 'CUSTOMER' || !user?.customer) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`/api/bookings/user/${user.customer.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        const data = await response.json();
        setBookings(data);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        const message = err instanceof Error ? err.message : 'Failed to load bookings';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [router, user, isLoggedIn, role, initializing]);

  const totalSavingsFormatted = useMemo(() => {
    if (!bookings) return '$0.00';
    return formatCurrency(bookings.totalSavings ?? 0);
  }, [bookings]);

  const getStatusClass = (status: BookingSummary['status']) => {
    switch (status) {
      case 'BOOKED':
        return styles.statusBooked;
      case 'COMPLETED':
        return styles.statusCompleted;
      case 'CANCELLED':
        return styles.statusCancelled;
      default:
        return styles.statusCompleted;
    }
  };

  const BookingCard = ({ booking }: { booking: BookingSummary }) => {
    const savings = Math.max(0, booking.originalTotal - booking.discountedTotal);

    return (
      <div
        onClick={() => router.push(`/customer/booking/${booking.id}/confirmation`)}
        className={styles.bookingCard}
      >
        <div className={styles.cardHeader}>
          <div className={styles.restaurantInfo}>
            <h3>{booking.restaurant.name}</h3>
            {booking.restaurant.category && (
              <p className={styles.restaurantCategory}>{booking.restaurant.category}</p>
            )}
          </div>
          <span className={`${styles.statusBadge} ${getStatusClass(booking.status)}`}>
            {booking.status}
          </span>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <p className={styles.detailLabel}>Date</p>
            <p className={styles.detailValue}>{formatDate(booking.startsAt)}</p>
          </div>
          <div className={styles.detailItem}>
            <p className={styles.detailLabel}>Time</p>
            <p className={styles.detailValue}>{formatTime(booking.startsAt)}</p>
          </div>
          <div className={styles.detailItem}>
            <p className={styles.detailLabel}>Party Size</p>
            <p className={styles.detailValue}>{booking.partySize} guests</p>
          </div>
        </div>

        {booking.items.length > 0 && (
          <div className={styles.itemsPreview}>
            <p className={styles.itemsTitle}>Pre-ordered Items</p>
            {booking.items.slice(0, 3).map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <span className={styles.itemName}>
                  • {item.menuItem.name} ×{item.quantity}
                  {item.notes && (
                    <span className={styles.itemNotes}>({item.notes})</span>
                  )}
                </span>
                <span className={styles.itemPrice}>{formatCurrency(item.menuItem.price * item.quantity)}</span>
              </div>
            ))}
            {booking.items.length > 3 && (
              <p className={styles.moreItems}>
                +{booking.items.length - 3} additional item(s)
              </p>
            )}
          </div>
        )}

        <div className={styles.cardFooter}>
          <div>
            {booking.discountPercent > 0 && booking.status !== 'CANCELLED' ? (
              <span className={styles.savings}>
                💰 Saved {formatCurrency(savings)} ({booking.discountPercent}% off)
              </span>
            ) : (
              <span className={styles.noSavings}>No discount applied</span>
            )}
          </div>
          <div className={styles.totalSection}>
            <p className={styles.totalLabel}>Total</p>
            <p className={styles.totalValue}>{formatCurrency(booking.discountedTotal)}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <CustomerNav />
        <div className={styles.inner}>
          <p className={styles.loadingState}>Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <CustomerNav />
        <div className={`${styles.inner} ${styles.errorState}`}>
          <p className={styles.errorText}>{error}</p>
          <button
            onClick={() => router.push('/customer/home')}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <CustomerNav />
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Bookings</h1>
          <p className={styles.subtitle}>Manage your restaurant reservations</p>
        </div>

        {bookings && bookings.totalBookings > 0 && (
          <div className={styles.statsCard}>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>Total Bookings</p>
              <p className={styles.statValue}>{bookings.totalBookings}</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>Total Savings</p>
              <p className={styles.statValue}>{totalSavingsFormatted}</p>
            </div>
          </div>
        )}

        {bookings && bookings.totalBookings === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📅</div>
            <h2 className={styles.emptyTitle}>No Bookings Yet</h2>
            <p className={styles.emptyText}>
              Start exploring restaurants and make your first reservation!
            </p>
            <button
              onClick={() => router.push('/customer/home')}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Explore Restaurants
            </button>
          </div>
        )}

        {bookings && bookings.upcoming.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Upcoming Reservations ({bookings.upcoming.length})
            </h2>
            <div className={styles.bookingsList}>
              {bookings.upcoming.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </div>
        )}

        {bookings && bookings.past.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Past & Cancelled Reservations ({bookings.past.length})
            </h2>
            <div className={styles.bookingsList}>
              {bookings.past.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
