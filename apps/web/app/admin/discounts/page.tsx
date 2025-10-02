'use client';

import { useState, useEffect } from 'react';
import DiscountOverrideModal from '@/components/admin/DiscountOverrideModal';
import styles from './AdminDiscounts.module.css';

interface Discount {
  id: number;
  time: string;
  hour: number;
  discount: number;
  bookingsReceived: number;
  createdAt: string;
  updatedAt: string;
}

interface DiscountsData {
  date: string;
  discounts: Discount[];
}

export default function AdminDiscountsPage() {
  const [data, setData] = useState<DiscountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [editedDiscounts, setEditedDiscounts] = useState<Record<number, number>>({});
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');

  useEffect(() => {
    fetchDiscounts();
    setEditedDiscounts({});
  }, [selectedDate]);

  useEffect(() => {
    fetchRestaurantInfo();
  }, []);

  const fetchRestaurantInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = await response.json();
        if (user.role === 'ADMIN' && user.restaurantName) {
          setRestaurantName(user.restaurantName);
        }
      }
    } catch (err) {
      console.error('Failed to fetch restaurant info:', err);
    }
  };

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/discounts?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch discounts');
      }
      const result = await response.json();
      setData(result);
      setError('');
    } catch (err: any) {
      console.error('Discounts fetch error:', err);
      setError(err.message || 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    if (!confirm('This will regenerate AI discounts for the selected date. Continue?')) {
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/refresh-discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: selectedDate,
          days: 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh discounts');
      }

      const result = await response.json();
      alert(`Success! ${result.totalSlotsUpdated} discount slots updated.`);
      setLastRefreshed(new Date().toISOString());
      setEditedDiscounts({});
      await fetchDiscounts();
    } catch (err: any) {
      alert('Error refreshing discounts: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDiscountChange = (discountId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    setEditedDiscounts(prev => ({ ...prev, [discountId]: clampedValue }));
  };

  const handlePublishChanges = async () => {
    if (Object.keys(editedDiscounts).length === 0) {
      alert('No changes to publish');
      return;
    }

    if (!confirm(`Publish ${Object.keys(editedDiscounts).length} discount changes?`)) {
      return;
    }

    setPublishing(true);
    try {
      // Update each edited discount
      const updates = Object.entries(editedDiscounts).map(([id, discount]) => ({
        id: parseInt(id),
        discount,
      }));

      const response = await fetch('/api/admin/discounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish changes');
      }

      alert('Discounts published successfully!');
      setEditedDiscounts({});
      await fetchDiscounts();
    } catch (err: any) {
      alert('Error publishing changes: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const getDiscountValue = (discount: Discount): number => {
    return editedDiscounts[discount.id] ?? discount.discount;
  };

  const hasChanges = Object.keys(editedDiscounts).length > 0;

  const formatTime = (time: string): string => {
    const [hourStr] = time.split(':');
    const hour = parseInt(hourStr);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const getDiscountPillClass = (discount: number): string => {
    if (discount >= 20) {
      return `${styles.pill} ${styles.pillYellow}`;
    }
    return `${styles.pill} ${styles.pillGreen}`;
  };

  const isManuallyOverridden = (discount: Discount): boolean => {
    // If updated time is significantly different from created time, it was manually changed
    const created = new Date(discount.createdAt);
    const updated = new Date(discount.updatedAt);
    return updated.getTime() - created.getTime() > 1000; // More than 1 second difference
  };

  const renderLoading = () => (
    <div className={styles.page}>
      <div>Loading discounts…</div>
    </div>
  );

  if (loading && !data) {
    return renderLoading();
  }

  const manualCount = data?.discounts.filter(isManuallyOverridden).length ?? 0;
  const averageDiscount = data && data.discounts.length
    ? (
        data.discounts.reduce((sum, d) => sum + d.discount, 0) / data.discounts.length
      ).toFixed(1)
    : '0.0';
  const totalBookings = data?.discounts.reduce((sum, d) => sum + d.bookingsReceived, 0) ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <a href="/customer/home" className={styles.topLink}>
          ← Back to Restaurants
        </a>
        <a href="/admin/dashboard" className={styles.topLink}>
          View dashboard
        </a>
      </div>

      <header className={styles.header}>
        {restaurantName && (
          <div className={styles.restaurantBadge}>
            <span className={styles.restaurantIcon}>🏪</span>
            <span className={styles.restaurantName}>{restaurantName}</span>
          </div>
        )}
        <h1 className={styles.title}>Discount management</h1>
        <p className={styles.subtitle}>Monitor AI pricing suggestions and apply manual overrides when needed.</p>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="discount-date">
            Select date
          </label>
          <input
            id="discount-date"
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <button className={styles.primaryButton} onClick={handleRefreshAll} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh all from AI'}
        </button>
        {hasChanges && (
          <button className={styles.primaryButton} onClick={handlePublishChanges} disabled={publishing}>
            {publishing ? 'Publishing…' : `Publish ${Object.keys(editedDiscounts).length} changes`}
          </button>
        )}
        {lastRefreshed && (
          <span className={styles.subtitle}>
            Last refreshed {new Date(lastRefreshed).toLocaleString()}
          </span>
        )}
      </section>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.legend}>
        <span className={styles.label}>Legend</span>
        <div className={styles.legendList}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#22c55e' }} />
            <span>AI-generated slot</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#f59e0b' }} />
            <span>Manually overridden</span>
          </div>
        </div>
      </section>

      <section className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time slot</th>
              <th>Discount %</th>
              <th>Bookings</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.discounts.map((discount) => {
              const currentValue = getDiscountValue(discount);
              const isEdited = editedDiscounts[discount.id] !== undefined;

              return (
                <tr key={discount.id}>
                  <td>{formatTime(discount.time)}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentValue}
                      onChange={(e) => handleDiscountChange(discount.id, e.target.value)}
                      className={`${styles.discountInput} ${isEdited ? styles.edited : ''}`}
                    />
                    <span className={styles.percentSign}>%</span>
                  </td>
                  <td>{discount.bookingsReceived} bookings</td>
                  <td>
                    <div className={styles.legendItem}>
                      <span
                        className={styles.legendDot}
                        style={{ background: isEdited ? '#3b82f6' : (isManuallyOverridden(discount) ? '#f59e0b' : '#22c55e') }}
                      />
                      <span>
                        {isEdited ? 'Pending' : (isManuallyOverridden(discount) ? 'Overridden' : 'AI-generated')}
                      </span>
                    </div>
                  </td>
                  <td>
                    {isEdited && (
                      <button
                        className={styles.tableActionSecondary}
                        onClick={() => {
                          const { [discount.id]: _, ...rest } = editedDiscounts;
                          setEditedDiscounts(rest);
                        }}
                      >
                        Revert
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data?.discounts.length === 0 && (
          <div className={styles.emptyState}>
            <p>No discounts found for this date.</p>
            <button className={styles.primaryButton} onClick={handleRefreshAll} disabled={refreshing}>
              Generate from AI
            </button>
          </div>
        )}
      </section>

      {data && data.discounts.length > 0 && (
        <section className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total slots</span>
            <span className={styles.statValue}>{data.discounts.length}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Average discount</span>
            <span className={styles.statValue}>{averageDiscount}%</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total bookings</span>
            <span className={styles.statValue}>{totalBookings}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Manual overrides</span>
            <span className={styles.statValue}>{manualCount}</span>
          </div>
        </section>
      )}

    </div>
  );
}
