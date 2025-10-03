# Real-Time Capacity API Guide

## Overview

The booking system now includes **real-time capacity tracking** that automatically updates based on active bookings. When a booking is made for a 2-hour window, the system shows reduced capacity for that specific time period.

---

## 🔄 How It Works

### Example Scenario:
**Initial State:**
- Restaurant has 50 total seats across all tables
- Table T1 has 6 seats
- No bookings exist

**After Booking (2 people at 5pm-7pm):**
- Restaurant shows: **48 available seats** (50 - 2) during 5pm-7pm window
- Table T1 shows: **4 available seats** (6 - 2) during 5pm-7pm window
- Outside this time window: Full capacity (50 seats) available

**When Booking Ends (7pm):**
- Restaurant automatically shows: **50 available seats**
- Table T1 shows: **6 available seats**
- System recalculates in real-time based on current bookings

---

## 📡 API Endpoints

### 1. Restaurant Overall Availability
**Endpoint:** `GET /api/restaurants/[id]/availability?date=YYYY-MM-DD&hour=HH`

Returns total available seats across the entire restaurant for a 2-hour booking window.

**Example Request:**
```bash
GET /api/restaurants/1/availability?date=2025-10-02&hour=17
```

**Response:**
```json
{
  "availableSeats": 48,
  "totalCapacity": 50,
  "bookedSeats": 2,
  "occupancyRate": 4,
  "timeWindow": {
    "startsAt": "2025-10-02T17:00:00.000Z",
    "endsAt": "2025-10-02T19:00:00.000Z",
    "duration": "2 hours"
  }
}
```

**Use Cases:**
- Show available seats when customer selects a time slot
- Display occupancy percentage for popular times
- Warn when restaurant is nearly full

---

### 2. Restaurant Detailed Capacity (All Tables)
**Endpoint:** `GET /api/restaurants/[id]/capacity?date=YYYY-MM-DD&hour=HH`

Returns capacity breakdown for **each individual table** in the restaurant.

**Example Request:**
```bash
GET /api/restaurants/1/capacity?date=2025-10-02&hour=17
```

**Response:**
```json
{
  "restaurant": {
    "totalCapacity": 50,
    "availableSeats": 48,
    "bookedSeats": 2,
    "occupancyRate": 4
  },
  "tables": [
    {
      "id": 1,
      "label": "T1",
      "totalCapacity": 6,
      "availableSeats": 4,
      "bookedSeats": 2,
      "isAvailable": true,
      "occupancyRate": 33
    },
    {
      "id": 2,
      "label": "T2",
      "totalCapacity": 8,
      "availableSeats": 8,
      "bookedSeats": 0,
      "isAvailable": true,
      "occupancyRate": 0
    },
    // ... more tables
  ],
  "timeWindow": {
    "startsAt": "2025-10-02T17:00:00.000Z",
    "endsAt": "2025-10-02T19:00:00.000Z",
    "duration": "2 hours"
  }
}
```

**Use Cases:**
- Admin dashboard showing table-by-table occupancy
- Capacity planning and visualization
- Identify which tables are busiest at specific times

---

### 3. Individual Table Capacity
**Endpoint:** `GET /api/tables/[tableId]/capacity?date=YYYY-MM-DD&hour=HH`

Returns capacity information for a **single specific table**.

**Example Request:**
```bash
GET /api/tables/1/capacity?date=2025-10-02&hour=17
```

**Response:**
```json
{
  "tableId": 1,
  "availableSeats": 4,
  "totalCapacity": 6,
  "bookedSeats": 2,
  "isAvailable": true,
  "occupancyRate": 33,
  "timeWindow": {
    "startsAt": "2025-10-02T17:00:00.000Z",
    "endsAt": "2025-10-02T19:00:00.000Z",
    "duration": "2 hours"
  }
}
```

**Use Cases:**
- Check if specific table can accommodate a party
- Show table availability in seating chart
- Real-time table status updates

---

## 🧮 Calculation Logic

### Overlapping Bookings
The system calculates availability based on **overlapping time windows**:

```typescript
// A booking overlaps if:
// booking.startsAt < requestedEndsAt AND
// booking.endsAt > requestedStartsAt

// Example:
// Requested: 5pm-7pm
// Overlapping bookings:
//   - 4pm-6pm ✓ (overlaps 5pm-6pm)
//   - 5pm-7pm ✓ (exact match)
//   - 6pm-8pm ✓ (overlaps 6pm-7pm)
//   - 3pm-5pm ✗ (ends at 5pm, no overlap)
//   - 7pm-9pm ✗ (starts at 7pm, no overlap)
```

### Seat Calculation
```typescript
availableSeats = totalCapacity - sum(overlappingBookings.partySize)
```

### Status Filtering
Only counts bookings with status:
- ✅ `BOOKED` (active reservations)
- ❌ `COMPLETED` (excluded - booking finished)
- ❌ `CANCELLED` (excluded - cancelled)

---

## 💡 Usage Examples

### Example 1: Customer Booking Flow
```typescript
// Step 1: Customer selects date and time
const date = '2025-10-02';
const hour = 17; // 5pm

// Step 2: Fetch restaurant availability
const response = await fetch(
  `/api/restaurants/1/availability?date=${date}&hour=${hour}`
);
const data = await response.json();

// Step 3: Show available seats to customer
console.log(`${data.availableSeats} seats available`);
// Output: "48 seats available"

// Step 4: Customer books for 2 people
// ...booking creation...

// Step 5: Fetch updated availability
const updatedResponse = await fetch(
  `/api/restaurants/1/availability?date=${date}&hour=${hour}`
);
const updatedData = await updatedResponse.json();

console.log(`${updatedData.availableSeats} seats available`);
// Output: "46 seats available" (48 - 2 = 46)
```

### Example 2: Admin Dashboard - Table View
```typescript
// Fetch detailed capacity for all tables
const response = await fetch(
  '/api/restaurants/1/capacity?date=2025-10-02&hour=17'
);
const data = await response.json();

// Display table grid with live occupancy
data.tables.forEach(table => {
  console.log(`${table.label}: ${table.availableSeats}/${table.totalCapacity} available`);
  console.log(`  Occupancy: ${table.occupancyRate}%`);
});

// Output:
// T1: 4/6 available
//   Occupancy: 33%
// T2: 8/8 available
//   Occupancy: 0%
// ...
```

### Example 3: Time-Based Availability Check
```typescript
// Check availability across multiple time slots
const hours = [17, 18, 19, 20]; // 5pm, 6pm, 7pm, 8pm
const availability = [];

for (const hour of hours) {
  const response = await fetch(
    `/api/restaurants/1/availability?date=2025-10-02&hour=${hour}`
  );
  const data = await response.json();
  availability.push({
    time: `${hour}:00`,
    available: data.availableSeats,
    occupancy: data.occupancyRate
  });
}

console.log(availability);
// Output:
// [
//   { time: '17:00', available: 48, occupancy: 4 },
//   { time: '18:00', available: 50, occupancy: 0 },
//   { time: '19:00', available: 45, occupancy: 10 },
//   { time: '20:00', available: 50, occupancy: 0 }
// ]
```

---

## 🎯 Key Features

✅ **Real-time updates** - Capacity recalculates based on current bookings
✅ **2-hour windows** - All calculations account for the 2-hour booking duration
✅ **Automatic expiry** - Capacity frees up when bookings end
✅ **Table-level granularity** - Track individual table occupancy
✅ **Restaurant-level totals** - Aggregate view across all tables
✅ **Occupancy rates** - Percentage-based capacity metrics
✅ **Status filtering** - Only counts active (BOOKED) reservations

---

## 📊 Response Fields

### Common Fields
| Field | Type | Description |
|-------|------|-------------|
| `availableSeats` | number | Remaining seats available for booking |
| `totalCapacity` | number | Total seats (table or restaurant) |
| `bookedSeats` | number | Seats currently booked in time window |
| `occupancyRate` | number | Percentage occupied (0-100) |
| `isAvailable` | boolean | Whether any seats are available |
| `timeWindow.startsAt` | ISO string | Start of 2-hour booking window |
| `timeWindow.endsAt` | ISO string | End of 2-hour booking window |
| `timeWindow.duration` | string | Always "2 hours" |

---

## 🚀 Integration Tips

### 1. Poll for Updates
For real-time dashboards, poll the API periodically:
```typescript
// Refresh every 30 seconds
setInterval(async () => {
  const data = await fetchCapacity();
  updateUI(data);
}, 30000);
```

### 2. Show Capacity Warnings
```typescript
if (data.availableSeats < 10) {
  showWarning('Only a few seats left!');
} else if (data.availableSeats === 0) {
  showError('Fully booked - try another time');
}
```

### 3. Visual Indicators
```typescript
const getOccupancyColor = (rate) => {
  if (rate < 50) return 'green';
  if (rate < 80) return 'yellow';
  return 'red';
};
```

---

## ⚠️ Important Notes

1. **Time Windows:** All capacity is calculated for a **2-hour window** starting at the requested hour
2. **Timezone:** Dates should be in ISO format; times are in local restaurant timezone
3. **Refresh Rate:** Capacity updates automatically when bookings are created/cancelled/completed
4. **No Caching:** Queries run in real-time against the database for accuracy
5. **Concurrency Safe:** Uses row-level locking during booking creation to prevent double-booking

---

## 📝 Example Integration

```typescript
// Complete booking flow with capacity checks
async function makeBooking(restaurantId, date, hour, partySize) {
  // 1. Check availability
  const capacity = await fetch(
    `/api/restaurants/${restaurantId}/availability?date=${date}&hour=${hour}`
  ).then(r => r.json());

  if (capacity.availableSeats < partySize) {
    throw new Error(`Only ${capacity.availableSeats} seats available`);
  }

  // 2. Create booking
  const booking = await fetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      restaurantId,
      bookingDate: date,
      bookingTime: hour,
      partySize,
      menuItems: [...]
    })
  }).then(r => r.json());

  // 3. Verify updated capacity
  const newCapacity = await fetch(
    `/api/restaurants/${restaurantId}/availability?date=${date}&hour=${hour}`
  ).then(r => r.json());

  console.log(`Capacity reduced from ${capacity.availableSeats} to ${newCapacity.availableSeats}`);

  return booking;
}
```

---

This real-time capacity system ensures accurate availability tracking and prevents overbooking across all restaurant tables! 🎉
