# Booking Status Behavior

## ✅ How Cancelled Bookings Work

### **Key Point: Cancelled Bookings DO Free Up Seats Immediately**

When a booking is cancelled, its status changes to `CANCELLED`, and the seats become **immediately available** for new bookings.

---

## 📊 Booking Status Types

```typescript
enum BookingStatus {
  BOOKED     // Active reservation
  COMPLETED  // Booking finished (after end time)
  CANCELLED  // Cancelled by customer or admin
}
```

---

## 🔍 How Each Status Affects Capacity

### **BOOKED** (Active)
- ✅ **Occupies seats** during the 2-hour booking window
- ✅ **Blocks capacity** from being used by other bookings
- ✅ **Counted in revenue** and guest statistics
- ✅ **Shown in availability** queries

### **CANCELLED**
- ❌ **Does NOT occupy seats** - Seats are freed immediately
- ❌ **Does NOT block capacity** - Other bookings can use those seats
- ❌ **Not counted in revenue** (excluded from active bookings)
- ❌ **Not shown in availability** queries
- ✅ **Retained for historical records** - Still in database for reporting

### **COMPLETED**
- ❌ **Does NOT occupy seats** - Booking time has passed
- ❌ **Does NOT block capacity** - Table is available again
- ✅ **Counted in historical revenue** statistics
- ❌ **Not shown in availability** queries

---

## 🧮 Capacity Calculation Examples

### Example: Table with 6 Seats

**Scenario 1: Active Booking**
```
Booking A: 4 people, 5pm-7pm, status=BOOKED

Query: Available seats at 6pm-8pm?
Result: 2 seats available (6 - 4 = 2)

Explanation: Booking overlaps 6pm-7pm, occupies 4 seats
```

**Scenario 2: Cancelled Booking**
```
Booking A: 4 people, 5pm-7pm, status=CANCELLED ✅

Query: Available seats at 6pm-8pm?
Result: 6 seats available (6 - 0 = 6)

Explanation: Cancelled bookings are excluded from capacity calculation
```

**Scenario 3: Mixed Statuses**
```
Booking A: 2 people, 5pm-7pm, status=BOOKED
Booking B: 3 people, 5pm-7pm, status=CANCELLED
Booking C: 1 person, 6pm-8pm, status=BOOKED

Query: Available seats at 6pm-8pm?
Result: 3 seats available

Calculation:
- 5pm-6pm: 2 (Booking A) = 4 available
- 6pm-7pm: 2 (Booking A) + 1 (Booking C) = 3 available ← Peak
- 7pm-8pm: 1 (Booking C) = 5 available

Max occupancy: 3, Available: 6 - 3 = 3 seats
Note: Booking B (CANCELLED) is completely ignored
```

---

## 🔧 Implementation Details

### Capacity Query Filter
All capacity functions use this filter:

```typescript
const overlappingBookings = await prisma.booking.findMany({
  where: {
    restaurantId,
    startsAt: { lt: endsAt },
    endsAt: { gt: startsAt },
    status: {
      notIn: ['COMPLETED', 'CANCELLED'],  // ✅ Excludes both
    },
  },
});
```

**Result:** Only `BOOKED` status bookings count toward capacity.

### Table Assignment Logic

```typescript
// When finding an available table:
// 1. Get all overlapping bookings (BOOKED only)
// 2. Calculate max concurrent occupancy
// 3. If maxOccupancy + newPartySize <= capacity → Assign table

// Cancelled bookings are automatically excluded from step 1
```

---

## 📋 Admin Dashboard Behavior

### **Before Fix:**
```
Query: GET /api/admin/bookings

Returns: ALL bookings (BOOKED, CANCELLED, COMPLETED)

Problem: Dashboard shows "16 bookings" even after cancelling all
```

### **After Fix:**
```
Query: GET /api/admin/bookings?bookingStatus=BOOKED

Returns: Only BOOKED bookings

Result: Dashboard now shows only active bookings
```

### **New Filter Options:**
```
1. All Statuses     → Shows everything (for history)
2. Active Only      → Shows only BOOKED (current reservations)
3. Cancelled Only   → Shows only CANCELLED (audit trail)
4. Completed Only   → Shows only COMPLETED (past bookings)
```

---

## 🎯 Real-World Scenarios

### Scenario 1: Customer Cancels, Then Rebooks

**Timeline:**
```
10:00am - Customer books Table T1 (4 seats) for 6pm-8pm
10:30am - Customer cancels booking
10:45am - Different customer tries to book Table T1 for 6pm-8pm

Result: ✅ Second booking SUCCEEDS
Reason: First booking is CANCELLED, table is available
```

### Scenario 2: Admin Cancels Last-Minute

**Timeline:**
```
5:30pm - Customer has booking for Table T2 (6 seats) at 6pm-8pm
5:45pm - Admin cancels due to emergency (power outage)
5:50pm - Walk-in customer tries to book for 6pm-8pm

Result: ✅ Walk-in booking SUCCEEDS
Reason: Cancelled booking freed up the table immediately
```

### Scenario 3: Multiple Cancellations

**Timeline:**
```
Initial state: 10 bookings for tonight (50 seats occupied)
Admin cancels 8 bookings (40 seats freed)

Before cancellation:
- Available capacity: 0 seats (50/50 occupied)

After cancellation:
- Available capacity: 40 seats (10/50 occupied)

Result: ✅ Restaurant can accept new bookings for those 40 seats
```

---

## 📊 Statistics & Reporting

### Revenue Calculations

**Active Bookings (BOOKED):**
```typescript
const activeRevenue = bookings
  .filter(b => b.status === 'BOOKED')
  .reduce((sum, b) => sum + b.discountedTotal, 0);
```

**Historical Revenue (All Completed):**
```typescript
const historicalRevenue = bookings
  .filter(b => b.status === 'COMPLETED')
  .reduce((sum, b) => sum + b.discountedTotal, 0);
```

**Lost Revenue (Cancelled):**
```typescript
const lostRevenue = bookings
  .filter(b => b.status === 'CANCELLED')
  .reduce((sum, b) => sum + b.discountedTotal, 0);
```

### Guest Count

**Expected Guests (BOOKED):**
```typescript
const expectedGuests = bookings
  .filter(b => b.status === 'BOOKED')
  .reduce((sum, b) => sum + b.partySize, 0);
```

**Served Guests (COMPLETED):**
```typescript
const servedGuests = bookings
  .filter(b => b.status === 'COMPLETED')
  .reduce((sum, b) => sum + b.partySize, 0);
```

---

## ⚠️ Important Notes

1. **Cancellation is Permanent**
   - Once cancelled, a booking cannot be "un-cancelled"
   - Customer must create a new booking

2. **Seats Free Immediately**
   - No delay between cancellation and seat availability
   - Real-time capacity updates

3. **Database Record Preserved**
   - Cancelled bookings remain in database
   - Used for analytics and reporting
   - Includes cancellation timestamp and reason

4. **No Automatic Status Changes**
   - BOOKED → COMPLETED requires manual update or cron job
   - System doesn't auto-cancel no-shows
   - Admin must manually update status

5. **Filter Defaults**
   - Admin dashboard shows ALL statuses by default
   - Capacity queries exclude CANCELLED/COMPLETED automatically
   - Customer view only shows their own bookings (all statuses)

---

## 🔄 Status Transitions

```
BOOKED ──────────────► CANCELLED (customer/admin cancels)
  │
  └──────────────────► COMPLETED (time passes)

CANCELLED ───X───► BOOKED (cannot revert)
COMPLETED ───X───► BOOKED (cannot revert)
```

**Valid Transitions:**
- ✅ BOOKED → CANCELLED (anytime before completion)
- ✅ BOOKED → COMPLETED (after booking end time)
- ❌ CANCELLED → BOOKED (not allowed)
- ❌ COMPLETED → BOOKED (not allowed)
- ❌ CANCELLED → COMPLETED (not allowed)

---

## 🧪 Testing

### Test 1: Cancelled Booking Frees Seats
```bash
# Step 1: Create booking
POST /api/bookings
{ partySize: 4, bookingTime: 17, ... }
# Response: { booking: { id: 1, status: "BOOKED" } }

# Step 2: Check capacity
GET /api/restaurants/1/availability?date=2025-10-02&hour=17
# Response: { availableSeats: 46 } (50 - 4 = 46)

# Step 3: Cancel booking
DELETE /api/bookings/1
# Response: { booking: { status: "CANCELLED" } }

# Step 4: Check capacity again
GET /api/restaurants/1/availability?date=2025-10-02&hour=17
# Response: { availableSeats: 50 } ✅ Seats freed!
```

### Test 2: Admin Filter
```bash
# View all bookings
GET /api/admin/bookings
# Returns: 16 bookings (all statuses)

# View only active bookings
GET /api/admin/bookings?bookingStatus=BOOKED
# Returns: 2 bookings (only BOOKED)

# View only cancelled bookings
GET /api/admin/bookings?bookingStatus=CANCELLED
# Returns: 14 bookings (only CANCELLED)
```

---

This status system ensures accurate capacity tracking while preserving booking history for analytics and reporting! ✅
