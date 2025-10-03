# Table Sharing Rules

## ✅ Table Sharing is ALLOWED

**Tables CAN be shared between different customer groups as long as the total party size doesn't exceed the table's seating capacity at ANY moment during overlapping time periods.**

---

## 🎯 Core Rule

```
At any given moment in time:
sum(all concurrent bookings' party sizes) <= table capacity
```

If this rule is violated at **any point** during the 2-hour booking window, the booking is rejected.

---

## 📊 How It Works - Your Example

### Scenario: Table with 4 Seats

**Booking 1:**
- Party size: **2 people**
- Time: **5pm-7pm**
- Table assigned: **T1** ✅

**Booking 2:**
- Party size: **4 people**
- Time: **6pm-8pm**
- Table requested: **T1**

**Analysis:**
```
Timeline:
5pm ━━━━━━━━━ 6pm ━━━━━━━━━ 7pm ━━━━━━━━━ 8pm
Booking 1:  2 people      2 people     (ends)
Booking 2:               4 people     4 people

Concurrent at 6pm-7pm: 2 + 4 = 6 people
Table capacity: 4 seats

6 > 4 ❌ EXCEEDS CAPACITY
```

**Result:** ❌ **Booking 2 REJECTED** on Table T1 (must use different table)

---

## ✅ Valid Table Sharing Examples

### Example 1: Sequential Bookings (NO Overlap)
```
Table: 6 seats

Booking A: 4 people, 5pm-7pm  ✅
Booking B: 4 people, 7pm-9pm  ✅

Timeline:
5pm ━━━━━━━━━ 7pm           (Booking A: 4 people)
              7pm ━━━━━━━━━ 9pm (Booking B: 4 people)

No overlap! Both bookings allowed on same table.
Max occupancy: 4 <= 6 ✅
```

### Example 2: Partial Overlap Within Capacity
```
Table: 6 seats

Booking A: 2 people, 5pm-7pm  ✅
Booking B: 3 people, 6pm-8pm  ✅

Timeline:
5pm ━━━━━━━━━ 6pm ━━━━━━━━━ 7pm ━━━━━━━━━ 8pm
Booking A:  2 people      2 people     (ends)
Booking B:               3 people     3 people

Concurrent at 6pm-7pm: 2 + 3 = 5 people
Table capacity: 6 seats

5 <= 6 ✅ WITHIN CAPACITY
```

**Result:** ✅ **Both bookings allowed** on same table

### Example 3: Multiple Small Groups
```
Table: 8 seats

Booking A: 2 people, 5pm-7pm  ✅
Booking B: 2 people, 5pm-7pm  ✅
Booking C: 3 people, 6pm-8pm  ✅

Timeline:
5pm ━━━━━━━━━ 6pm ━━━━━━━━━ 7pm ━━━━━━━━━ 8pm
Booking A:  2 people      2 people     (ends)
Booking B:  2 people      2 people     (ends)
Booking C:               3 people     3 people

Max concurrent:
- 5pm-6pm: 2 + 2 = 4 people
- 6pm-7pm: 2 + 2 + 3 = 7 people ← Peak
- 7pm-8pm: 3 people

Peak: 7 <= 8 ✅ WITHIN CAPACITY
```

**Result:** ✅ **All 3 bookings allowed** on same table

---

## ❌ Invalid Table Sharing Examples

### Example 1: Exceeds Capacity During Overlap
```
Table: 4 seats

Booking A: 2 people, 5pm-7pm  ✅
Booking B: 4 people, 6pm-8pm  ❌

6pm-7pm: 2 + 4 = 6 people > 4 seats ❌
```

### Example 2: Multiple Overlaps Exceed Capacity
```
Table: 6 seats

Booking A: 3 people, 5pm-7pm  ✅
Booking B: 2 people, 5pm-7pm  ✅
Booking C: 2 people, 6pm-8pm  ❌

6pm-7pm: 3 + 2 + 2 = 7 people > 6 seats ❌
```

### Example 3: Same Start Time Exceeds Capacity
```
Table: 8 seats

Booking A: 5 people, 6pm-8pm  ✅
Booking B: 5 people, 6pm-8pm  ❌

6pm-8pm: 5 + 5 = 10 people > 8 seats ❌
```

---

## 🔍 Maximum Concurrent Occupancy Algorithm

The system uses a **sweep line algorithm** to check capacity:

```typescript
function calculateMaxConcurrentOccupancy(
  existingBookings,
  newBooking
) {
  // 1. Collect all time points where occupancy changes
  const timePoints = [];

  // Add start/end times for all bookings
  existingBookings.forEach(booking => {
    timePoints.push({ time: booking.startsAt, delta: +booking.partySize });
    timePoints.push({ time: booking.endsAt,   delta: -booking.partySize });
  });

  // Add new booking
  timePoints.push({ time: newBooking.startsAt, delta: +newBooking.partySize });
  timePoints.push({ time: newBooking.endsAt,   delta: -newBooking.partySize });

  // 2. Sort by time
  timePoints.sort((a, b) => a.time - b.time);

  // 3. Sweep through and track peak occupancy
  let currentOccupancy = 0;
  let maxOccupancy = 0;

  for (const point of timePoints) {
    currentOccupancy += point.delta;
    maxOccupancy = Math.max(maxOccupancy, currentOccupancy);
  }

  return maxOccupancy;
}

// If maxOccupancy <= tableCapacity → Allow booking
// If maxOccupancy > tableCapacity  → Reject booking
```

---

## 📐 Capacity Calculation Examples

### Restaurant-Wide Capacity
```
Restaurant with 3 tables:
- T1: 4 seats
- T2: 6 seats
- T3: 8 seats
Total: 18 seats

Bookings at 6pm-8pm:
- T1: 2 people (5pm-7pm) + 1 person (6pm-8pm) = max 3/4 → 1 available
- T2: 4 people (6pm-8pm) → 2 available
- T3: 0 bookings → 8 available

Available at 6pm-8pm: 1 + 2 + 8 = 11 seats
```

### Single Table Capacity
```
Table T1: 6 seats

Bookings:
- 2 people, 5pm-7pm
- 3 people, 6pm-8pm

Query: Available at 6pm-8pm?

Max occupancy 6pm-8pm: 2 + 3 = 5 people
Available: 6 - 5 = 1 seat ✅
```

---

## 🎯 Real-World Application

### Communal Tables / Bar Seating
This table-sharing model works perfectly for:
- **Communal tables** - Multiple groups sharing a long table
- **Bar seating** - Different customers at different seats
- **Outdoor patio** - Shared picnic-style tables

### Private Tables (No Sharing)
If you want **exclusive tables** (each table = one group only):
- Set `table capacity = minimum party size`
- Or modify `findAvailableTable()` to reject if ANY booking exists

---

## 🧪 Test Scenarios

### Test 1: Valid Sharing
```bash
# Table T1: 6 seats

# Booking 1: 2 people at 5pm-7pm
POST /api/bookings
{
  "partySize": 2,
  "bookingTime": 17,
  ...
}
# Expected: ✅ Success on T1

# Booking 2: 3 people at 6pm-8pm
POST /api/bookings
{
  "partySize": 3,
  "bookingTime": 18,
  ...
}
# Expected: ✅ Success on T1 (2+3=5 <= 6)
```

### Test 2: Exceeds Capacity
```bash
# Table T1: 4 seats

# Booking 1: 2 people at 5pm-7pm
POST /api/bookings { "partySize": 2, "bookingTime": 17 }
# Expected: ✅ Success on T1

# Booking 2: 4 people at 6pm-8pm
POST /api/bookings { "partySize": 4, "bookingTime": 18 }
# Expected: ✅ Success on DIFFERENT table (T2, T3, etc.)
# Expected: ❌ Error if no other tables available
```

### Test 3: Capacity Query
```bash
# After bookings above on Table T1 (6 seats):
GET /api/tables/1/capacity?date=2025-10-02&hour=18

# Expected:
{
  "availableSeats": 1,  // 6 - (2+3) = 1
  "totalCapacity": 6,
  "bookedSeats": 5
}
```

---

## ⚙️ Technical Implementation

### 1. Table Assignment (`findAvailableTable`)
```typescript
// For each table:
// 1. Check if table.capacity >= newBooking.partySize
// 2. Get all overlapping bookings
// 3. Calculate max concurrent occupancy (including new booking)
// 4. If maxOccupancy <= tableCapacity → assign table
// 5. Otherwise, try next table
```

### 2. Capacity Queries
All capacity functions calculate **maximum concurrent occupancy**:
- `calculateAvailableSeats()` - Restaurant-wide
- `getTableAvailableCapacity()` - Single table
- `getRestaurantTablesAvailability()` - All tables

### 3. Row-Level Locking
```sql
SELECT id, "seatingCap"
FROM "DiningTable"
WHERE "restaurantId" = ?
FOR UPDATE  -- Prevents race conditions
```

---

## ✅ Key Benefits

1. **Efficient Use of Space** - Tables can serve multiple small groups
2. **Higher Capacity** - Restaurant can accept more bookings
3. **Flexible Booking** - Customers aren't blocked by partial table usage
4. **Accurate Tracking** - System ensures capacity is never exceeded
5. **Real-Time Updates** - Availability reflects actual concurrent usage

---

## 🚨 Important Notes

1. **2-Hour Windows** - All bookings are 2-hour blocks
2. **Moment-in-Time Validation** - Checks EVERY moment, not just start times
3. **Automatic Assignment** - System finds best-fit table
4. **Concurrency Safe** - Row-level locking prevents double-booking
5. **Status Filtering** - Only `BOOKED` status counts (not `COMPLETED`/`CANCELLED`)

---

This table-sharing model maximizes restaurant capacity while ensuring no table ever exceeds its physical seating limit! 🎉
