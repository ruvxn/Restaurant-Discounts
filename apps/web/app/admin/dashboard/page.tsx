'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AdminDashboard.module.css';

interface DashboardStats {
  today: {
    bookingsCount: number;
    revenue: number;
    occupancyPercentage: number;
    averageDiscount: number;
    averagePartySize: number;
  };
  upcoming: {
    totalCount: number;
    byDate: Record<string, { count: number; guests: number }>;
  };
  popularTimeSlots: Array<{ hour: number; count: number }>;
  stats: {
    totalSeats: number;
    occupiedSeats: number;
    totalBookings: number;
    completedBookings: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err: unknown) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshDiscounts = async () => {
    if (!confirm('This will regenerate AI discounts for the next 7 days. Continue?')) {
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/refresh-discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh discounts');
      }

      const data = await response.json();
      alert(`Success! ${data.totalSlotsUpdated} discount slots updated.`);

      // Refresh stats
      await fetchDashboardStats();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to refresh discounts';
      alert('Error refreshing discounts: ' + message);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className={styles.fallback}>
        <p className={styles.fallbackMessage}>Loading dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={styles.fallback}>
        <p className={styles.fallbackMessage}>{error || 'Failed to load dashboard'}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.layout}>
        <section className={styles.hero}>
          <div className={styles.heroIntro}>
            <span className={styles.heroBadge}>
              <span role="img" aria-label="sparkles">✨</span>
              Daily performance overview
            </span>
            <h1 className={styles.heroTitle}>Restaurant Dashboard</h1>
            <p className={styles.heroSubtitle}>
              Monitor bookings, stay ahead of demand, and keep your AI-powered discounts on-brand.
            </p>
          </div>
          <div className={styles.heroSummary}>
            <span className={styles.heroSummaryLabel}>Today&apos;s revenue</span>
            <h2 className={styles.heroSummaryValue}>${stats.today.revenue.toFixed(2)}</h2>
            <span className={styles.heroSummaryNote}>{stats.today.bookingsCount} bookings so far</span>
          </div>
        </section>

        <section className={styles.quickActions}>
          <button
            onClick={handleRefreshDiscounts}
            disabled={refreshing}
            className={styles.actionCard}
          >
            <div className={styles.actionHeader}>
              <span className={styles.actionTitle}>
                {refreshing ? 'Refreshing...' : 'Refresh AI Discounts'}
              </span>
              <span className={styles.actionIcon}>⚡️</span>
            </div>
            <p className={styles.actionCopy}>Regenerate smart pricing for the upcoming week.</p>
          </button>
          <button
            onClick={() => router.push('/admin/discounts')}
            className={styles.actionCard}
          >
            <div className={styles.actionHeader}>
              <span className={styles.actionTitle}>View Discounts</span>
              <span className={styles.actionIcon}>🏷️</span>
            </div>
            <p className={styles.actionCopy}>Fine-tune overrides and publish new offers.</p>
          </button>
          <button
            onClick={() => router.push('/admin/bookings')}
            className={styles.actionCard}
          >
            <div className={styles.actionHeader}>
              <span className={styles.actionTitle}>View All Bookings</span>
              <span className={styles.actionIcon}>📅</span>
            </div>
            <p className={styles.actionCopy}>Inspect reservations and manage guest flow.</p>
          </button>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Today&apos;s bookings</span>
              <h2 className={styles.kpiValue}>{stats.today.bookingsCount}</h2>
              <p className={styles.kpiMeta}>Avg party size {stats.today.averagePartySize.toFixed(1)}</p>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Today&apos;s revenue</span>
              <h2 className={styles.kpiValue}>${stats.today.revenue.toFixed(2)}</h2>
              <p className={styles.kpiMeta}>Confirmed bookings only</p>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Seat occupancy</span>
              <h2 className={styles.kpiValue}>{stats.today.occupancyPercentage.toFixed(1)}%</h2>
              <p className={styles.kpiMeta}>
                {stats.stats.occupiedSeats} / {stats.stats.totalSeats} seats filled
              </p>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Avg discount today</span>
              <h2 className={styles.kpiValue}>{stats.today.averageDiscount.toFixed(1)}%</h2>
              <p className={styles.kpiMeta}>Across all time slots</p>
            </div>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Next 7 Days ({stats.upcoming.totalCount} bookings)</h2>
            <span className={styles.sectionBadge}>Guest forecast</span>
          </div>
          <div className={styles.upcomingGrid}>
            {Object.entries(stats.upcoming.byDate)
              .slice(0, 7)
              .map(([date, data]) => (
                <div key={date} className={styles.upcomingCard}>
                  <p className={styles.upcomingDate}>{formatDate(date)}</p>
                  <p className={styles.upcomingCount}>{data.count}</p>
                  <p className={styles.upcomingGuests}>{data.guests} guests</p>
                </div>
              ))}
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Most Popular Time Slots</h2>
            <span className={styles.sectionBadge}>Peak demand</span>
          </div>
          <div className={styles.slotGrid}>
            {stats.popularTimeSlots.map((slot, index) => (
              <div key={slot.hour} className={styles.slotCard}>
                <div className={styles.actionHeader}>
                  <div>
                    <p className={styles.slotTitle}>{formatTime(slot.hour)}</p>
                    <p className={styles.slotMeta}>{slot.count} bookings</p>
                  </div>
                  <span className={styles.actionIcon}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Overall Statistics</h2>
            <span className={styles.sectionBadge}>Cumulative view</span>
          </div>
          <div className={styles.overallGrid}>
            <div className={styles.overallCard}>
              <span className={styles.overallLabel}>Total bookings</span>
              <span className={styles.overallValue}>{stats.stats.totalBookings}</span>
            </div>
            <div className={styles.overallCard}>
              <span className={styles.overallLabel}>Completed bookings</span>
              <span className={styles.overallValue}>{stats.stats.completedBookings}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
