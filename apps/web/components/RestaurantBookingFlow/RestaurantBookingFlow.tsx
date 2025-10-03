'use client';

import React, { useState, useEffect } from 'react';
import SeatingSelector from '@/components/SeatingSelector';
import type { Table } from '@/components/SeatingSelector';
import styles from './RestaurantBookingFlow.module.css';

interface MenuItem {
  id: number;
  name: string;
  category: string;
}

interface RestaurantBookingFlowProps {
  restaurantId: number;
  customerId: number;
  onBookingComplete?: (bookingId: number) => void;
  onCancel?: () => void;
}

type Step = 'menu' | 'party' | 'datetime' | 'table' | 'confirm';

export default function RestaurantBookingFlow({
  restaurantId,
  customerId,
  onBookingComplete,
  onCancel,
}: RestaurantBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('menu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<number | null>(null);
  const [partySize, setPartySize] = useState<number>(2);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number>(18);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  // Data state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [restaurantName, setRestaurantName] = useState<string>('');

  // Initialize date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Fetch menu items on mount
  useEffect(() => {
    async function fetchMenu() {
      try {
        const response = await fetch(`/api/admin/menu?restaurantId=${restaurantId}`);
        if (response.ok) {
          const data = await response.json();
          setMenuItems(data.menuItems || []);
          setRestaurantName(data.restaurantName || 'Restaurant');
        }
      } catch (err) {
        console.error('Error fetching menu:', err);
      }
    }
    fetchMenu();
  }, [restaurantId]);

  // Fetch tables when date/time changes
  useEffect(() => {
    if (currentStep === 'table' && selectedDate && selectedHour !== null) {
      fetchTables();
    }
  }, [currentStep, selectedDate, selectedHour]);

  async function fetchTables() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/restaurants/${restaurantId}/capacity?date=${selectedDate}&hour=${selectedHour}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch table availability');
      }

      const data = await response.json();

      const transformedTables: Table[] = data.tables.map((table: any) => ({
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

      setTables(transformedTables);
    } catch (err) {
      setError('Failed to load table availability');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const startsAt = new Date(selectedDate);
      startsAt.setHours(selectedHour, 0, 0, 0);

      const payload: any = {
        customerId,
        restaurantId,
        partySize,
        startsAt: startsAt.toISOString(),
        menuItems: selectedMenuItemId ? [{ menuItemId: selectedMenuItemId }] : [],
      };

      // Include tableId if user selected a specific table
      if (selectedTableId) {
        payload.tableId = selectedTableId;
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Booking failed');
      }

      const data = await response.json();

      if (onBookingComplete) {
        onBookingComplete(data.booking.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  }

  function canProceedFromMenu(): boolean {
    return selectedMenuItemId !== null;
  }

  function canProceedFromParty(): boolean {
    return partySize >= 1 && partySize <= 20;
  }

  function canProceedFromDateTime(): boolean {
    return selectedDate !== '' && selectedHour >= 0 && selectedHour <= 23;
  }

  function canProceedFromTable(): boolean {
    // Table selection is optional - user can proceed without selecting
    return true;
  }

  const selectedMenuItem = menuItems.find((item) => item.id === selectedMenuItemId);

  return (
    <div className={styles.container}>
      {/* Progress indicator */}
      <div className={styles.progressBar}>
        <div className={`${styles.step} ${currentStep === 'menu' ? styles.active : ''}`}>
          1. Menu
        </div>
        <div className={`${styles.step} ${currentStep === 'party' ? styles.active : ''}`}>
          2. Party Size
        </div>
        <div className={`${styles.step} ${currentStep === 'datetime' ? styles.active : ''}`}>
          3. Date & Time
        </div>
        <div className={`${styles.step} ${currentStep === 'table' ? styles.active : ''}`}>
          4. Table
        </div>
        <div className={`${styles.step} ${currentStep === 'confirm' ? styles.active : ''}`}>
          5. Confirm
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Step 1: Menu Selection */}
      {currentStep === 'menu' && (
        <div className={styles.stepContent}>
          <h2>Select a Menu</h2>
          <p className={styles.stepDescription}>
            Choose the menu you'd like to order from. This determines available dishes for your
            booking.
          </p>

          <div className={styles.menuGrid}>
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`${styles.menuCard} ${selectedMenuItemId === item.id ? styles.selected : ''}`}
                onClick={() => setSelectedMenuItemId(item.id)}
              >
                <div className={styles.menuCategory}>{item.category}</div>
                <div className={styles.menuName}>{item.name}</div>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            {onCancel && (
              <button className={styles.btnSecondary} onClick={onCancel}>
                Cancel
              </button>
            )}
            <button
              className={styles.btnPrimary}
              disabled={!canProceedFromMenu()}
              onClick={() => setCurrentStep('party')}
            >
              Next: Party Size
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Party Size */}
      {currentStep === 'party' && (
        <div className={styles.stepContent}>
          <h2>Party Size</h2>
          <p className={styles.stepDescription}>How many guests will be dining?</p>

          <div className={styles.formGroup}>
            <label htmlFor="partySize">Number of Guests</label>
            <input
              id="partySize"
              type="number"
              min="1"
              max="20"
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
              className={styles.input}
            />
            <small>Maximum 20 guests per booking</small>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setCurrentStep('menu')}>
              Back
            </button>
            <button
              className={styles.btnPrimary}
              disabled={!canProceedFromParty()}
              onClick={() => setCurrentStep('datetime')}
            >
              Next: Date & Time
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Date & Time */}
      {currentStep === 'datetime' && (
        <div className={styles.stepContent}>
          <h2>Date & Time</h2>
          <p className={styles.stepDescription}>When would you like to dine?</p>

          <div className={styles.formGroup}>
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="hour">Time</label>
            <select
              id="hour"
              value={selectedHour}
              onChange={(e) => setSelectedHour(parseInt(e.target.value))}
              className={styles.select}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setCurrentStep('party')}>
              Back
            </button>
            <button
              className={styles.btnPrimary}
              disabled={!canProceedFromDateTime()}
              onClick={() => setCurrentStep('table')}
            >
              Next: Select Table
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Table Selection */}
      {currentStep === 'table' && (
        <div className={styles.stepContent}>
          <h2>Select a Table (Optional)</h2>
          <p className={styles.stepDescription}>
            Choose a specific table or skip to let the system assign one automatically.
          </p>

          {loading ? (
            <div className={styles.loading}>Loading table availability...</div>
          ) : tables.length === 0 ? (
            <div className={styles.noTables}>No tables available for this time slot</div>
          ) : (
            <SeatingSelector
              restaurantId={restaurantId}
              date={selectedDate}
              hour={selectedHour}
              tables={tables}
              selectedTableId={selectedTableId || undefined}
              onTableSelect={(table) => setSelectedTableId(table.id)}
            />
          )}

          {selectedTableId && (
            <div className={styles.selectionInfo}>
              Selected: <strong>{tables.find((t) => t.id === selectedTableId)?.label}</strong>
              <button
                className={styles.btnClear}
                onClick={() => setSelectedTableId(null)}
              >
                Clear Selection
              </button>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setCurrentStep('datetime')}>
              Back
            </button>
            <button
              className={styles.btnPrimary}
              disabled={!canProceedFromTable()}
              onClick={() => setCurrentStep('confirm')}
            >
              Next: Review & Confirm
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Confirmation */}
      {currentStep === 'confirm' && (
        <div className={styles.stepContent}>
          <h2>Review Your Booking</h2>
          <p className={styles.stepDescription}>Please review the details before confirming.</p>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Restaurant:</span>
              <strong>{restaurantName}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Menu:</span>
              <strong>{selectedMenuItem?.name || 'N/A'}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Party Size:</span>
              <strong>{partySize} guests</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Date:</span>
              <strong>{selectedDate}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Time:</span>
              <strong>{selectedHour.toString().padStart(2, '0')}:00</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Table:</span>
              <strong>
                {selectedTableId
                  ? tables.find((t) => t.id === selectedTableId)?.label
                  : 'Auto-assigned'}
              </strong>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setCurrentStep('table')}>
              Back
            </button>
            <button
              className={styles.btnPrimary}
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Creating Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
