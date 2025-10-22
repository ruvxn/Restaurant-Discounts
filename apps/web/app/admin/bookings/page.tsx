'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDateLocal } from '@/src/lib/time';
import styles from './AdminBookings.module.css';

interface BookingItem {
  id: number;
  qty: number;
  menuItem: {
    id: number;
    name: string;
    priceCents: number;
  };
}

interface Booking {
  id: number;
  startsAt: string;
  endsAt: string;
  partySize: number;
  originalTotal: number;
  discountedTotal: number;
  discountPercent: number;
  status: string;
  customer: {
    id: number;
    name: string;
  };
  table: {
    id: number;
    label: string;
    seatingCap: number;
  };
  items: BookingItem[];
}

interface BookingsData {
  bookings: Booking[];
  summary: {
    totalBookings: number;
    totalRevenue: number;
    totalSavings: number;
    totalGuests: number;
  };
}

interface Customer {
  id: number;
  name: string;
  email: string;
}

interface MenuItem {
  id: number;
  name: string;
  priceCents: number;
  category: string | null;
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const [data, setData] = useState<BookingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBookingStatus, setFilterBookingStatus] = useState('all'); // BOOKED, CANCELLED, COMPLETED
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [bookingToModify, setBookingToModify] = useState<Booking | null>(null);

  // Create booking state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingHour, setBookingHour] = useState('12');
  const [partySize, setPartySize] = useState(2);
  const [selectedMenuItems, setSelectedMenuItems] = useState<Map<number, number>>(new Map());
  const [creating, setCreating] = useState(false);
  const [modifying, setModifying] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchCustomers();
    fetchMenuItems();
  }, [filterDate, filterStatus, filterBookingStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterBookingStatus !== 'all') params.append('bookingStatus', filterBookingStatus);

      const response = await fetch(`/api/admin/bookings?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Bookings fetch error:', err);
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customer/list');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/admin/menu');
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.menuItems || []);
      }
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleCreateBooking = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!bookingDate) {
      toast.error('Please select a date');
      return;
    }

    if (selectedMenuItems.size === 0) {
      toast.error('Please select at least one menu item');
      return;
    }

    setCreating(true);

    try {
      const menuItemsPayload = Array.from(selectedMenuItems.entries()).map(([menuItemId, quantity]) => ({
        menuItemId,
        quantity,
      }));

      const response = await fetch('/api/admin/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          bookingDate,
          bookingTime: parseInt(bookingHour),
          partySize,
          menuItems: menuItemsPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      toast.success('Booking created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create booking');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking? As an admin, you can cancel at any time.')) return;

    try {
      // Use admin-specific cancellation endpoint (no 24-hour restriction)
      const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by admin' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel booking');
      }

      toast.success('Booking cancelled successfully');
      setSelectedBooking(null);
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel booking');
    }
  };

  const resetCreateForm = () => {
    setSelectedCustomer(null);
    setSearchTerm('');
    setBookingDate('');
    setBookingHour('12');
    setPartySize(2);
    setSelectedMenuItems(new Map());
  };

  const openModifyModal = (booking: Booking) => {
    setBookingToModify(booking);
    // OLD: const dateStr = new Date(booking.startsAt).toISOString().split('T')[0];
    // NEW: Use formatDateLocal to avoid timezone conversion issues
    const dateStr = formatDateLocal(new Date(booking.startsAt));
    const hour = new Date(booking.startsAt).getHours();

    setBookingDate(dateStr);
    setBookingHour(hour.toString());
    setPartySize(booking.partySize);

    const menuMap = new Map<number, number>();
    booking.items.forEach(item => {
      menuMap.set(item.menuItem.id, item.qty);
    });
    setSelectedMenuItems(menuMap);

    setShowModifyModal(true);
  };

  const handleModifyBooking = async () => {
    if (!bookingToModify) return;

    if (!bookingDate) {
      toast.error('Please select a date');
      return;
    }

    if (selectedMenuItems.size === 0) {
      toast.error('Please select at least one menu item');
      return;
    }

    setModifying(true);

    try {
      const menuItemsPayload = Array.from(selectedMenuItems.entries()).map(([menuItemId, quantity]) => ({
        menuItemId,
        quantity,
      }));

      const response = await fetch(`/api/bookings/${bookingToModify.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingDate,
          bookingTime: parseInt(bookingHour),
          partySize,
          menuItems: menuItemsPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update booking');
      }

      toast.success('Booking updated successfully!');
      setShowModifyModal(false);
      setBookingToModify(null);
      setSelectedBooking(null);
      resetCreateForm();
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update booking');
    } finally {
      setModifying(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (!data) return;

    const headers = ['ID', 'Customer', 'Date', 'Time', 'Party Size', 'Table', 'Discount %', 'Original Total', 'Final Total', 'Savings', 'Status'];
    const rows = data.bookings.map(b => [
      b.id,
      b.customer.name,
      new Date(b.startsAt).toLocaleDateString(),
      new Date(b.startsAt).toLocaleTimeString(),
      b.partySize,
      b.table.label,
      b.discountPercent,
      b.originalTotal.toFixed(2),
      b.discountedTotal.toFixed(2),
      (b.originalTotal - b.discountedTotal).toFixed(2),
      b.status,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // OLD: a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    // NEW: Use formatDateLocal to avoid timezone conversion issues
    a.download = `bookings-${formatDateLocal(new Date())}.csv`;
    a.click();
  };

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <p style={{ textAlign: 'center', color: '#718096' }}>Loading bookings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p style={{ textAlign: 'center', color: '#f56565' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back Button */}
      <button
        className={styles.backButton}
        onClick={() => router.push('/admin/dashboard')}
        style={{ marginBottom: '1rem' }}
      >
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Bookings Management</h1>
          <p>View and manage all restaurant bookings</p>
        </div>
        <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
          + Create Booking
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filtersRow}>
          <div className={styles.formGroup}>
            <label>Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Time Filter</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Times</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Booking Status</label>
            <select value={filterBookingStatus} onChange={(e) => setFilterBookingStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="BOOKED">Active Only</option>
              <option value="CANCELLED">Cancelled Only</option>
              <option value="COMPLETED">Completed Only</option>
            </select>
          </div>
          <button className={styles.buttonSecondary} onClick={() => { setFilterDate(''); setFilterStatus('all'); setFilterBookingStatus('all'); }}>
            Clear Filters
          </button>
          <button className={styles.buttonSuccess} onClick={exportToCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Bookings</p>
            <p className={styles.statValue}>{data.summary.totalBookings}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Revenue</p>
            <p className={`${styles.statValue} ${styles.statValueGreen}`}>${data.summary.totalRevenue.toFixed(2)}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Savings</p>
            <p className={`${styles.statValue} ${styles.statValueOrange}`}>${data.summary.totalSavings.toFixed(2)}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Guests</p>
            <p className={styles.statValue}>{data.summary.totalGuests}</p>
          </div>
        </div>
      )}

      {/* Bookings Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Date & Time</th>
              <th>Party</th>
              <th>Table</th>
              <th>Discount</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.bookings.map((booking) => (
              <tr key={booking.id}>
                <td><span className={styles.customerName}>{booking.customer.name}</span></td>
                <td>{formatDateTime(booking.startsAt)}</td>
                <td>{booking.partySize} guests</td>
                <td>{booking.table.label}</td>
                <td style={{ color: '#48bb78', fontWeight: 600 }}>{booking.discountPercent}%</td>
                <td>
                  <div>${booking.discountedTotal.toFixed(2)}</div>
                  {booking.discountPercent > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#a0aec0', textDecoration: 'line-through' }}>
                      ${booking.originalTotal.toFixed(2)}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${
                    booking.status === 'BOOKED' ? styles.statusBooked :
                    booking.status === 'CANCELLED' ? styles.statusCancelled :
                    styles.statusCompleted
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td>
                  <span className={styles.actionButton} onClick={() => setSelectedBooking(booking)}>
                    View Details
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.bookings.length === 0 && (
          <div className={styles.emptyState}>
            No bookings found matching your filters
          </div>
        )}
      </div>

      {/* Create Booking Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Booking</h2>
              <button className={styles.closeButton} onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {/* Customer Selection */}
              <div className={styles.formGroup}>
                <label>Search Customer</label>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {!selectedCustomer && searchTerm && (
                  <div className={styles.customerList}>
                    {filteredCustomers.map(customer => (
                      <div
                        key={customer.id}
                        className={styles.customerItem}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSearchTerm('');
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{customer.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#718096' }}>{customer.email}</div>
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#a0aec0' }}>
                        No customers found
                      </div>
                    )}
                  </div>
                )}
                {selectedCustomer && (
                  <div className={styles.selectedCustomer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{selectedCustomer.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>{selectedCustomer.email}</div>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Date, Time, Party Size */}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={formatDateLocal(new Date())}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Time</label>
                  <select value={bookingHour} onChange={(e) => setBookingHour(e.target.value)}>
                    {Array.from({ length: 14 }, (_, i) => i + 10).map(hour => (
                      <option key={hour} value={hour}>
                        {hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Party Size</label>
                  <select value={partySize} onChange={(e) => setPartySize(parseInt(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(size => (
                      <option key={size} value={size}>{size} {size === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Menu Items */}
              <div className={styles.formGroup}>
                <label>Menu Items</label>
                {menuItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f7fafc' }}>
                    <span>{item.name} - ${(item.priceCents / 100).toFixed(2)}</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={selectedMenuItems.get(item.id) || 0}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 0;
                        const newMap = new Map(selectedMenuItems);
                        if (qty > 0) {
                          newMap.set(item.id, qty);
                        } else {
                          newMap.delete(item.id);
                        }
                        setSelectedMenuItems(newMap);
                      }}
                      style={{ width: '80px', padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.modalActions}>
                <button className={styles.buttonOutline} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button
                  className={styles.buttonPrimary}
                  onClick={handleCreateBooking}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Booking Details</h2>
              <button className={styles.closeButton} onClick={() => setSelectedBooking(null)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <label>Booking ID</label>
                  <p style={{ fontFamily: 'monospace' }}>{selectedBooking.id}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Customer</label>
                  <p>{selectedBooking.customer.name}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Date & Time</label>
                  <p>{formatDateTime(selectedBooking.startsAt)}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Party Size</label>
                  <p>{selectedBooking.partySize} guests</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Table Assignment</label>
                  <p>{selectedBooking.table.label} (Capacity: {selectedBooking.table.seatingCap})</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Status</label>
                  <p>
                    <span className={`${styles.statusBadge} ${
                      selectedBooking.status === 'BOOKED' ? styles.statusBooked :
                      selectedBooking.status === 'CANCELLED' ? styles.statusCancelled :
                      styles.statusCompleted
                    }`}>
                      {selectedBooking.status}
                    </span>
                  </p>
                </div>
              </div>

              {selectedBooking.items.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#718096' }}>
                    Pre-ordered Items
                  </label>
                  <div className={styles.itemsList}>
                    {selectedBooking.items.map(item => (
                      <div key={item.id} className={styles.itemRow}>
                        <span>{item.menuItem.name} × {item.qty}</span>
                        <span>${((item.menuItem.priceCents * item.qty) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.pricingSection}>
                <div className={styles.pricingRow}>
                  <span>Original Total:</span>
                  <span>${selectedBooking.originalTotal.toFixed(2)}</span>
                </div>
                <div className={`${styles.pricingRow} ${styles.discount}`}>
                  <span>Discount ({selectedBooking.discountPercent}%):</span>
                  <span>-${(selectedBooking.originalTotal - selectedBooking.discountedTotal).toFixed(2)}</span>
                </div>
                <div className={`${styles.pricingRow} ${styles.total}`}>
                  <span>Final Total:</span>
                  <span>${selectedBooking.discountedTotal.toFixed(2)}</span>
                </div>
              </div>

              {selectedBooking.status === 'BOOKED' && (
                <div className={styles.modalActions}>
                  <button className={styles.buttonOutline} onClick={() => setSelectedBooking(null)}>
                    Close
                  </button>
                  <button
                    className={styles.buttonPrimary}
                    onClick={() => {
                      setSelectedBooking(null);
                      openModifyModal(selectedBooking);
                    }}
                  >
                    Modify Booking
                  </button>
                  <button
                    className={styles.buttonDanger}
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                  >
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modify Booking Modal */}
      {showModifyModal && bookingToModify && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Modify Booking #{bookingToModify.id}</h2>
              <button className={styles.closeButton} onClick={() => {
                setShowModifyModal(false);
                setBookingToModify(null);
                resetCreateForm();
              }}>×</button>
            </div>

            <div className={styles.modalBody}>
              {/* Customer info (read-only) */}
              <div className={styles.formGroup}>
                <label>Customer</label>
                <div className={styles.selectedCustomer}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{bookingToModify.customer.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>ID: {bookingToModify.customer.id}</div>
                  </div>
                </div>
              </div>

              {/* Date, Time, Party Size */}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={formatDateLocal(new Date())}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Time</label>
                  <select value={bookingHour} onChange={(e) => setBookingHour(e.target.value)}>
                    {Array.from({ length: 14 }, (_, i) => i + 10).map(hour => (
                      <option key={hour} value={hour}>
                        {hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Party Size</label>
                  <select value={partySize} onChange={(e) => setPartySize(parseInt(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(size => (
                      <option key={size} value={size}>{size} {size === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Menu Items */}
              <div className={styles.formGroup}>
                <label>Menu Items</label>
                {menuItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f7fafc' }}>
                    <span>{item.name} - ${(item.priceCents / 100).toFixed(2)}</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={selectedMenuItems.get(item.id) || 0}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 0;
                        const newMap = new Map(selectedMenuItems);
                        if (qty > 0) {
                          newMap.set(item.id, qty);
                        } else {
                          newMap.delete(item.id);
                        }
                        setSelectedMenuItems(newMap);
                      }}
                      style={{ width: '80px', padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.modalActions}>
                <button className={styles.buttonOutline} onClick={() => {
                  setShowModifyModal(false);
                  setBookingToModify(null);
                  resetCreateForm();
                }}>
                  Cancel
                </button>
                <button
                  className={styles.buttonPrimary}
                  onClick={handleModifyBooking}
                  disabled={modifying}
                >
                  {modifying ? 'Updating...' : 'Update Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
