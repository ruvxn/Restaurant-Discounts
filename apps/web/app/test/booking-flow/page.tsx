'use client';

import { useState } from 'react';
import RestaurantBookingFlow from '@/components/RestaurantBookingFlow';

export default function BookingFlowTestPage() {
  const [bookingComplete, setBookingComplete] = useState(false);
  const [completedBookingId, setCompletedBookingId] = useState<number | null>(null);

  // Test with Sushi House (restaurantId: 1) and a test customer (customerId: 1)
  const restaurantId = 1;
  const customerId = 1;

  function handleBookingComplete(bookingId: number) {
    setCompletedBookingId(bookingId);
    setBookingComplete(true);
  }

  function handleCancel() {
    alert('Booking cancelled');
  }

  function resetFlow() {
    setBookingComplete(false);
    setCompletedBookingId(null);
  }

  if (bookingComplete) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ color: '#4caf50', marginBottom: '1rem' }}>✓ Booking Complete!</h1>
        <p style={{ fontSize: '18px', marginBottom: '2rem' }}>
          Your booking has been successfully created.
        </p>
        <div
          style={{
            background: '#e8f5e9',
            border: '2px solid #4caf50',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <p style={{ fontSize: '16px', margin: 0 }}>
            <strong>Booking ID:</strong> {completedBookingId}
          </p>
        </div>
        <button
          onClick={resetFlow}
          style={{
            background: '#2196f3',
            color: 'white',
            border: 'none',
            padding: '0.75rem 2rem',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Create Another Booking
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '0.5rem' }}>Restaurant Booking System Test</h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Complete interactive booking flow with SeatingSelector integration
          </p>
        </div>

        <RestaurantBookingFlow
          restaurantId={restaurantId}
          customerId={customerId}
          onBookingComplete={handleBookingComplete}
          onCancel={handleCancel}
        />

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            background: '#fff3e0',
            border: '1px solid #ff9800',
            borderRadius: '8px',
          }}
        >
          <strong>Test Configuration:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.5rem', color: '#666' }}>
            <li>Restaurant ID: {restaurantId} (Sushi House)</li>
            <li>Customer ID: {customerId}</li>
            <li>Features: Menu selection, party size, date/time, interactive table selection, confirmation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
