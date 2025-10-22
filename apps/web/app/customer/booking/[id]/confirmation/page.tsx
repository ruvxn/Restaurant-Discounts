'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import CustomerNav from '@/components/CustomerNav';
import MenuItemSelector from '@/components/MenuItemSelector';
import { LoadingSpinner } from '@/components/ErrorBoundary';
import { toast } from 'sonner';
import { formatDateLocal } from '@/src/lib/time';
import styles from '../Confirmation.module.css';

interface BookingItemSummary {
  id: number;
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string | null;
}

interface RawBookingItem {
  id: number;
  qty: number;
  notes?: string | null;
  menuItem: {
    id: number;
    name: string;
    priceCents: number;
  };
}

interface RawBooking {
  id: number;
  status: 'BOOKED' | 'COMPLETED' | 'CANCELLED';
  startsAt: string;
  endsAt: string;
  partySize: number;
  discountPercent: number;
  originalTotal: number;
  discountedTotal: number;
  cancelledAt?: string | null;
  restaurant?: {
    id: number;
    name: string;
    category?: string | null;
  };
  table?: {
    label?: string | null;
  };
  items: RawBookingItem[];
}

interface DiscountResponse {
  discounts: Array<{ time: string; discount: number }>;
}

interface BookingDetails {
  id: number;
  status: 'BOOKED' | 'COMPLETED' | 'CANCELLED';
  startsAt: Date;
  endsAt: Date;
  partySize: number;
  tableLabel?: string | null;
  discountPercent: number;
  originalTotal: number;
  discountedTotal: number;
  restaurant: {
    id: number;
    name: string;
    category?: string | null;
  };
  items: BookingItemSummary[];
  cancelledAt?: Date | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  imageUrl?: string;
  price: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
}

interface RestaurantMenuResponse {
  menuItems: Array<{
    id: number;
    name: string;
    description?: string | null;
    category?: string | null;
    imageUrl?: string | null;
    priceCents: number;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
  }>;
}

const MODIFY_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatTime = (date: Date) => {
  const hours = date.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:00 ${period}`;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const transformBooking = (rawBooking: RawBooking): BookingDetails => {
  const startsAt = new Date(rawBooking.startsAt);
  const endsAt = new Date(rawBooking.endsAt);
  const discountPercent = rawBooking.discountPercent ?? 0;

  // Apply discount to item prices to show what customer actually paid
  const items: BookingItemSummary[] = (rawBooking.items || []).map((item) => {
    const originalPriceCents = item.menuItem?.priceCents ?? 0;
    const originalPrice = originalPriceCents / 100;

    // Apply the booking's discount to the item price
    const discountedPrice = originalPrice * (1 - discountPercent / 100);
    const discountedTotal = discountedPrice * item.qty;

    console.log(`Item: ${item.menuItem?.name}`);
    console.log(`  Original price: $${originalPrice} (${originalPriceCents} cents)`);
    console.log(`  Discount: ${discountPercent}%`);
    console.log(`  Discounted price: $${discountedPrice.toFixed(2)}`);
    console.log(`  Quantity: ${item.qty}`);
    console.log(`  Total: $${discountedTotal.toFixed(2)}`);

    return {
      id: item.id,
      menuItemId: item.menuItem?.id ?? 0,
      name: item.menuItem?.name ?? 'Menu item',
      quantity: item.qty,
      price: discountedPrice,  // Show discounted price per item
      total: discountedTotal,   // Show discounted total for this item
      notes: item.notes ?? null,
    };
  });

  return {
    id: rawBooking.id,
    status: rawBooking.status,
    startsAt,
    endsAt,
    partySize: rawBooking.partySize,
    tableLabel: rawBooking.table?.label ?? null,
    discountPercent,
    originalTotal: rawBooking.originalTotal ?? 0,
    discountedTotal: rawBooking.discountedTotal ?? 0,
    restaurant: {
      id: rawBooking.restaurant?.id ?? 0,
      name: rawBooking.restaurant?.name ?? 'Restaurant',
      category: rawBooking.restaurant?.category ?? null,
    },
    items,
    cancelledAt: rawBooking.cancelledAt ? new Date(rawBooking.cancelledAt) : null,
  };
};

interface ModifyBookingModalProps {
  booking: BookingDetails;
  onClose: () => void;
  onUpdated: (updated: BookingDetails) => void;
}

interface SelectedItemState {
  quantity: number;
  notes?: string;
}

// OLD: const getDateParam = (date: Date) => date.toISOString().split('T')[0];
// NEW: Use formatDateLocal to avoid timezone conversion issues
const getDateParam = (date: Date) => formatDateLocal(date);

function ModifyBookingModal({ booking, onClose, onUpdated }: ModifyBookingModalProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partySize, setPartySize] = useState(booking.partySize);
  const [selectedHour, setSelectedHour] = useState(booking.startsAt.getHours());
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemState>>(() => {
    const initial = new Map<string, SelectedItemState>();
    booking.items.forEach((item) => {
      if (item.menuItemId) {
        initial.set(String(item.menuItemId), {
          quantity: item.quantity,
          notes: item.notes ?? undefined,
        });
      }
    });
    return initial;
  });
  const [hourlyDiscounts, setHourlyDiscounts] = useState<Record<number, number>>({});
  const [currentDiscount, setCurrentDiscount] = useState(booking.discountPercent);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchMenuAndDiscounts = async () => {
      try {
        const restaurantResponse = await fetch(`/api/restaurants/${booking.restaurant.id}`);
        if (!restaurantResponse.ok) {
          throw new Error('Failed to load menu');
        }
        const restaurantData: RestaurantMenuResponse = await restaurantResponse.json();
        if (!isActive) return;

        const items: MenuItem[] = restaurantData.menuItems.map((item) => ({
          id: String(item.id),
          name: item.name,
          description: item.description ?? '',
          category: item.category ?? undefined,
          imageUrl: item.imageUrl ?? undefined,
          price: item.priceCents / 100,
          isVegetarian: item.isVegetarian,
          isVegan: item.isVegan,
          isGlutenFree: item.isGlutenFree,
        }));
        setMenuItems(items);

        const dateParam = getDateParam(booking.startsAt);
        const discountResponse = await fetch(
          `/api/restaurants/${booking.restaurant.id}/discounts?date=${encodeURIComponent(dateParam)}`
        );
        if (discountResponse.ok) {
          const { discounts } = (await discountResponse.json()) as DiscountResponse;
          const discountMap: Record<number, number> = {};
          discounts.forEach((entry) => {
            const hour = parseInt(String(entry.time).split(':')[0], 10);
            discountMap[hour] = entry.discount;
          });
          if (isActive) {
            setHourlyDiscounts(discountMap);
          }
        }
      } catch (err) {
        console.error('Modify modal load error:', err);
        if (isActive) {
          const message = err instanceof Error ? err.message : 'Failed to load booking data';
          setError(message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchMenuAndDiscounts();

    return () => {
      isActive = false;
    };
  }, [booking]);

  useEffect(() => {
    if (hourlyDiscounts[selectedHour] !== undefined) {
      setCurrentDiscount(hourlyDiscounts[selectedHour]);
    }
  }, [hourlyDiscounts, selectedHour]);

  const handleMenuItemChange = (itemId: string, quantity: number, notes?: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      const normalizedNotes =
        notes !== undefined ? (notes?.trim().length ? notes.trim() : undefined) : existing?.notes;

      if (quantity > 0) {
        next.set(itemId, { quantity, notes: normalizedNotes });
      } else {
        next.delete(itemId);
      }

      return next;
    });
  };

  const priceSummary = useMemo(() => {
    let subtotal = 0;
    const details: Array<{ id: string; name: string; quantity: number; price: number; notes?: string }> = [];

    selectedItems.forEach((value, itemId) => {
      const menuItem = menuItems.find((item) => item.id === itemId);
      if (!menuItem) return;
      const lineTotal = menuItem.price * value.quantity;
      subtotal += lineTotal;
      details.push({
        id: itemId,
        name: menuItem.name,
        quantity: value.quantity,
        price: menuItem.price,
        notes: value.notes,
      });
    });

    const subtotalFixed = Number(subtotal.toFixed(2));
    const discountAmount = Number(((subtotalFixed * currentDiscount) / 100).toFixed(2));
    const total = Number((subtotalFixed - discountAmount).toFixed(2));

    return {
      subtotal: subtotalFixed,
      discountAmount,
      total,
      items: details,
    };
  }, [selectedItems, menuItems, currentDiscount]);

  const availableHours = useMemo(() => {
    const hours = Object.keys(hourlyDiscounts)
      .map((key) => parseInt(key, 10))
      .filter((hour) => !Number.isNaN(hour))
      .sort((a, b) => a - b);
    return hours.length > 0 ? hours : Array.from({ length: 24 }, (_, i) => i);
  }, [hourlyDiscounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const menuItemsPayload = Array.from(selectedItems.entries())
        .map(([menuItemId, value]) => ({
          menuItemId,
          quantity: value.quantity,
          notes: value.notes,
        }))
        .filter((item) => item.quantity > 0);

      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partySize,
          bookingTime: selectedHour,
          menuItems: menuItemsPayload,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update booking');
      }

      toast.success('Booking updated!');
      onUpdated(transformBooking(data.booking));
      onClose();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to update booking';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Modify Booking</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close modify modal"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <LoadingSpinner size="md" />
              <p className="mt-3 text-sm">Loading menu and availability…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Party Size
                  </label>
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Booking Hour
                  </label>
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {availableHours.map((hour) => (
                      <option key={hour} value={hour}>
                        {formatTime(new Date(new Date(booking.startsAt).setHours(hour, 0, 0, 0)))}
                        {hourlyDiscounts[hour] !== undefined && ` (${hourlyDiscounts[hour]}% off)`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-gray-900">Update Pre-order</h3>
                  <p className="text-sm text-gray-600">
                    Adjust quantities or add new dishes. Notes will be relayed directly to the kitchen.
                  </p>
                </div>
                <MenuItemSelector
                  items={menuItems}
                  selectedItems={selectedItems}
                  onItemChange={handleMenuItemChange}
                  discountPercent={currentDiscount}
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Updated Summary</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(priceSummary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({currentDiscount}% )</span>
                    <span>-{formatCurrency(priceSummary.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-200 pt-2">
                    <span>New total</span>
                    <span>{formatCurrency(priceSummary.total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {submitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const bookingId = unwrappedParams.id;

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('Booking not found');
      }
      const data: { booking: RawBooking } = await response.json();
      console.log('Raw booking data:', data.booking);
      console.log('Discount percent:', data.booking.discountPercent);
      console.log('Original total:', data.booking.originalTotal);
      console.log('Discounted total:', data.booking.discountedTotal);
      const transformed = transformBooking(data.booking);
      console.log('Transformed booking:', transformed);
      setBooking(transformed);
    } catch (err) {
      console.error('Error fetching booking:', err);
      const message = err instanceof Error ? err.message : 'Failed to load booking details';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const savings = useMemo(() => {
    if (!booking) return 0;
    const difference = booking.originalTotal - booking.discountedTotal;
    return Number(Math.max(difference, 0).toFixed(2));
  }, [booking]);

  const canModify = useMemo(() => {
    if (!booking) return false;
    if (booking.status !== 'BOOKED') return false;
    return booking.startsAt.getTime() - Date.now() > MODIFY_WINDOW_MS;
  }, [booking]);

  const canCancel = useMemo(() => {
    if (!booking) return false;
    if (booking.status !== 'BOOKED') return false;
    return booking.startsAt.getTime() - Date.now() > CANCEL_WINDOW_MS;
  }, [booking]);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Cancelled via customer portal' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to cancel booking');
      }
      toast.success('Booking cancelled successfully');
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              status: 'CANCELLED',
              cancelledAt: data.booking?.cancelledAt
                ? new Date(data.booking.cancelledAt)
                : new Date(),
            }
          : prev
      );
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to cancel booking';
      toast.error(message);
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <CustomerNav />
        <div className={styles.inner} style={{ justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <p style={{ color: '#a04b2a' }}>Loading booking confirmation...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className={styles.page}>
        <CustomerNav />
        <div className={styles.inner} style={{ justifyContent: 'center', alignItems: 'center', minHeight: '50vh', textAlign: 'center' }}>
          <p style={{ color: '#dc2626', marginBottom: '20px', fontSize: '1.1rem' }}>{error || 'Booking not found'}</p>
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

  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className={styles.page}>
      <CustomerNav />
      <div className={styles.inner}>
        <div className={`${styles.statusBanner} ${isCancelled ? styles.statusBannerCancelled : styles.statusBannerSuccess}`}>
          <div className={styles.statusIcon}>{isCancelled ? '✖' : '✓'}</div>
          <h1 className={styles.statusTitle}>
            {isCancelled ? 'Booking Cancelled' : 'Booking Confirmed!'}
          </h1>
          <p className={styles.statusMessage}>
            {isCancelled
              ? 'This reservation has been cancelled. Feel free to book another time.'
              : 'Your reservation has been successfully created. We look forward to hosting you!'}
          </p>
          {isCancelled && booking.cancelledAt && (
            <p className={styles.statusMessage} style={{ marginTop: '12px', color: '#dc2626' }}>
              Cancelled on {formatDate(booking.cancelledAt)} at {formatTime(booking.cancelledAt)}
            </p>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.restaurantInfo}>
              <h2>{booking.restaurant.name}</h2>
              {booking.restaurant.category && (
                <p className={styles.restaurantCategory}>{booking.restaurant.category}</p>
              )}
            </div>
            <div className={styles.bookingMeta}>
              <p className={styles.metaLabel}>Reservation ID</p>
              <p className={styles.metaValue}>{booking.id}</p>
              {booking.tableLabel && (
                <p className={styles.metaLabel} style={{ marginTop: '8px' }}>Table: {booking.tableLabel}</p>
              )}
            </div>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detailCard}>
              <p className={styles.detailLabel}>Date</p>
              <p className={styles.detailValue}>{formatDate(booking.startsAt)}</p>
            </div>
            <div className={styles.detailCard}>
              <p className={styles.detailLabel}>Time</p>
              <p className={styles.detailValue}>{formatTime(booking.startsAt)}</p>
            </div>
            <div className={styles.detailCard}>
              <p className={styles.detailLabel}>Party Size</p>
              <p className={styles.detailValue}>{booking.partySize} {booking.partySize === 1 ? 'Guest' : 'Guests'}</p>
            </div>
            <div className={styles.detailCard}>
              <p className={styles.detailLabel}>Status</p>
              <span className={`${styles.statusBadge} ${
                isCancelled
                  ? styles.statusCancelled
                  : booking.status === 'COMPLETED'
                  ? styles.statusCompleted
                  : styles.statusBooked
              }`}>
                {booking.status}
              </span>
            </div>
          </div>

          <div>
            <div className={styles.sectionTitle}>
              <span>Pre-order Summary</span>
              {booking.items.length > 0 && (
                <span className={styles.itemBadge}>
                  {booking.items.length} item{booking.items.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {booking.items.length > 0 ? (
              <div className={styles.itemsList} style={{ marginTop: '20px' }}>
                {booking.items.map((item) => {
                  // Calculate original price for comparison if there's a discount
                  const originalPrice = booking.discountPercent > 0
                    ? item.price / (1 - booking.discountPercent / 100)
                    : item.price;

                  return (
                    <div key={item.id} className={styles.item}>
                      <div className={styles.itemHeader}>
                        <div>
                          <p className={styles.itemName}>
                            {item.name}
                            <span className={styles.itemQty}>× {item.quantity}</span>
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p className={styles.itemPrice}>{formatCurrency(item.price)} each</p>
                            {booking.discountPercent > 0 && (
                              <p style={{
                                fontSize: '0.8rem',
                                color: '#94a3b8',
                                textDecoration: 'line-through'
                              }}>
                                {formatCurrency(originalPrice)}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className={styles.itemTotal}>{formatCurrency(item.total)}</p>
                      </div>
                      {item.notes && (
                        <p className={styles.itemNotes}>Note: {item.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                No items pre-ordered — feel free to order on arrival.
              </div>
            )}
          </div>

          <div className={styles.pricingSummary}>
            <div className={styles.pricingRow}>
              <span className={styles.pricingLabel}>Original total</span>
              <span className={styles.pricingValue}>{formatCurrency(booking.originalTotal)}</span>
            </div>
            {booking.discountPercent > 0 && (
              <div className={`${styles.pricingRow} ${styles.discountRow}`}>
                <span className={styles.pricingLabel}>Discount ({booking.discountPercent}%)</span>
                <span className={styles.pricingValue}>-{formatCurrency(savings)}</span>
              </div>
            )}
            <div className={`${styles.pricingRow} ${styles.totalRow}`}>
              <span className={styles.pricingLabel}>Total due</span>
              <span className={styles.pricingValue}>{formatCurrency(booking.discountedTotal)}</span>
            </div>
          </div>

          {savings > 0 && booking.discountPercent > 0 && (
            <div className={styles.savingsBanner}>
              🎉 You saved {formatCurrency(savings)} with the {booking.discountPercent}% off-peak discount!
            </div>
          )}
        </div>

        <div className={styles.actionsRow}>
          <button
            onClick={() => router.push('/customer/bookings')}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            View All Bookings
          </button>
          <button
            onClick={() => router.push('/customer/home')}
            className={`${styles.button} ${styles.buttonSecondary}`}
          >
            Back to Home
          </button>
        </div>

        <div className={styles.managementCard}>
          <h3 className={styles.managementTitle}>Manage this booking</h3>
          <div className={styles.managementButtons}>
            <button
              onClick={() => setShowModifyModal(true)}
              disabled={!canModify}
              className={`${styles.button} ${canModify ? styles.buttonModify : ''}`}
            >
              Modify Booking
            </button>
            <button
              onClick={handleCancel}
              disabled={!canCancel || cancelLoading}
              className={`${styles.button} ${canCancel && !cancelLoading ? styles.buttonCancel : ''}`}
            >
              {cancelLoading ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          </div>
          <p className={styles.helpText}>
            Modifications are available up to 2 hours before your arrival time. Cancellations are allowed up to 24 hours in advance.
          </p>
          {!canCancel && booking.status === 'BOOKED' && (
            <p className={styles.warningText}>
              This booking is within the 24-hour window and can no longer be cancelled online. Please contact the restaurant directly for assistance.
            </p>
          )}
        </div>
      </div>
      {showModifyModal && booking && (
        <ModifyBookingModal
          booking={booking}
          onClose={() => setShowModifyModal(false)}
          onUpdated={(updated) => {
            setBooking(updated);
            setShowModifyModal(false);
          }}
        />
      )}
    </div>
  );
}
