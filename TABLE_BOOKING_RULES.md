# Table Booking Rules - IMPORTANT

## 🚨 Critical Rule: NO TABLE SHARING

**Each table can only have ONE booking at a time during any overlapping period.**

Tables **CANNOT** be shared between different customer groups, even if there are enough seats available.

---

## ❌ What Was Wrong Before (BUG FIXED)

### Previous Broken Behavior:
The system **incorrectly** allowed table sharing based on seat capacity:

**Example Scenario:**
- Table T1 has **4 seats**
- Booking 1: **2 people** from **5pm-7pm**
- Booking 2: **4 people** from **6pm-8pm**

**What Happened (WRONG):**
- ✅ Booking 1 created → Table T1 assigned (2 seats used, 2 available)
- ✅ Booking 2 created → Table T1 assigned (system thought: 4 - 2 = 2 available) ❌ **BUG!**

**The Problem:**
During the **overlap period (6pm-7pm)**, two different customer groups would be seated at the same physical table. This is impossible in a real restaurant!

---

## ✅ Correct Behavior (FIXED)

### New Exclusive Table Assignment:

**Same Scenario:**
- Table T1 has **4 seats**
- Booking 1: **2 people** from **5pm-7pm**
- Booking 2: **4 people** from **6pm-8pm**

**What Happens Now (CORRECT):**
- ✅ Booking 1 created → Table T1 assigned
- ❌ Booking 2 **REJECTED** → Table T1 is occupied during 6pm-7pm
- ✅ Booking 2 must use a **different table** (e.g., T2, T3, etc.)

---

## 🔍 How Overlap Detection Works

### Overlap Logic:
Two bookings overlap if:
```typescript
booking1.startsAt < booking2.endsAt AND
booking1.endsAt > booking2.startsAt
```

### Visual Examples:

#### Example 1: OVERLAPPING ❌
```
Booking 1: [5pm ========== 7pm]
Booking 2:           [6pm ========== 8pm]
Overlap:             [6pm == 7pm] ← NOT ALLOWED on same table
```

#### Example 2: NOT OVERLAPPING ✅
```
Booking 1: [5pm ========== 7pm]
Booking 2:                      [7pm ========== 9pm]
No Overlap: Booking 2 starts exactly when Booking 1 ends ← ALLOWED on same table
```

#### Example 3: OVERLAPPING (Different Start Times) ❌
```
Booking 1: [4pm ========== 6pm]
Booking 2:      [5pm ========== 7pm]
Overlap:         [5pm == 6pm] ← NOT ALLOWED on same table
```

#### Example 4: OVERLAPPING (One Contains Other) ❌
```
Booking 1: [3pm ================= 5pm]
Booking 2:      [4pm == 6pm]
Overlap:         [4pm == 5pm] ← NOT ALLOWED on same table
```

---

## 📊 Capacity Calculation

### Restaurant Level:
```typescript
// For each table:
// - If table has ANY overlapping booking → mark as occupied
// - Sum capacity of all unoccupied tables = available seats

// Example:
// Restaurant has 3 tables:
// - T1 (4 seats) - Has booking 5pm-7pm → OCCUPIED
// - T2 (6 seats) - No bookings → AVAILABLE (6 seats)
// - T3 (8 seats) - No bookings → AVAILABLE (8 seats)
//
// At 5pm-7pm:
// Available seats = 6 + 8 = 14 (NOT 4 + 6 + 8 = 18)
```

### Table Level:
```typescript
// For a specific table:
// - If ANY overlapping booking exists → 0 available seats
// - If NO overlapping bookings → full capacity available

// Example:
// Table T1 (4 seats):
// - Booking exists 5pm-7pm for 2 people
// - Query: Check availability at 6pm-8pm
// - Result: 0 available seats (table is occupied)
// - NOT: 2 available seats (4 - 2) ← This was the bug!
```

---

## 🛠️ Technical Implementation

### 1. Table Assignment (`findAvailableTable()`)
```typescript
// For each table in the restaurant:
// 1. Check if table capacity >= party size
// 2. Check if there are ANY overlapping bookings
// 3. If overlapping bookings exist → skip this table
// 4. If no overlapping bookings → assign this table
```

### 2. Capacity Queries
All capacity functions now implement exclusive table usage:

- `calculateAvailableSeats()` - Restaurant-wide capacity
- `getTableAvailableCapacity()` - Single table capacity
- `getRestaurantTablesAvailability()` - All tables breakdown

Each function checks for **any** overlapping booking, not seat counts.

---

## 🎯 Real-World Examples

### Scenario 1: Peak Dinner Rush
**Restaurant Setup:**
- 5 tables: T1(4), T2(4), T3(6), T4(6), T5(8) = 28 total seats

**Bookings:**
- 6:00pm-8:00pm: 3 bookings assigned to T1, T2, T3

**Available Capacity at 6:00pm-8:00pm:**
- Occupied: T1, T2, T3 (14 seats unavailable)
- Available: T4, T5 (14 seats available)
- ✅ Can accept: Party of 6 (T4) or Party of 8 (T5)
- ❌ Cannot accept: Party of 10 (no single table available)

### Scenario 2: Staggered Bookings
**Restaurant Setup:**
- 3 tables: T1(6), T2(6), T3(6) = 18 total seats

**Timeline:**
- 5:00pm-7:00pm: Booking on T1
- 6:00pm-8:00pm: Booking on T2
- 7:00pm-9:00pm: Booking on T3

**Available Capacity:**
- At 5:00pm-7:00pm: 12 seats (T2, T3 available)
- At 6:00pm-8:00pm: 6 seats (only T3 available - T1 & T2 occupied)
- At 7:00pm-9:00pm: 12 seats (T1, T2 available - T1's booking ended at 7pm)

### Scenario 3: Same Table, Different Times
**Table:** T1 (4 seats)

**Allowed:**
```
5pm-7pm: Booking A (2 people) ✅
7pm-9pm: Booking B (4 people) ✅ (no overlap, different time slots)
```

**Not Allowed:**
```
5pm-7pm: Booking A (2 people) ✅
6pm-8pm: Booking B (2 people) ❌ (overlap 6pm-7pm)
```

---

## 🔒 Database Constraints

### Unique Constraint
The schema includes:
```prisma
@@unique([customerId, tableId, startsAt])
```

This prevents the **same customer** from double-booking the **same table** at the **same time**, but it does NOT prevent **different customers** from booking the same table at overlapping times.

**Application Layer Enforcement:**
The business logic in `findAvailableTable()` enforces the no-sharing rule by checking for ANY overlapping bookings, regardless of customer.

---

## ⚠️ Important Notes

1. **2-Hour Duration:** All bookings are 2 hours, so overlaps are calculated with `endsAt = startsAt + 2 hours`

2. **Status Filtering:** Only `BOOKED` status bookings count as occupying a table. `COMPLETED` and `CANCELLED` bookings don't block availability.

3. **Concurrency Safety:** Row-level locking (`FOR UPDATE`) prevents race conditions during table assignment.

4. **Real-Time Updates:** Capacity automatically updates when:
   - New booking created
   - Booking cancelled
   - Booking completed
   - Booking time changes (modification)

5. **Customer Experience:** Better to show fewer available seats accurately than to accept bookings that create conflicts.

---

## 🧪 Testing Scenarios

### Test 1: Basic Overlap Prevention
```bash
# Setup: Table T1 (4 seats)
# Create Booking 1: 2 people, 5pm-7pm on T1
POST /api/bookings
{
  "partySize": 2,
  "bookingTime": 17, // 5pm
  ...
}
# Expected: ✅ Success

# Create Booking 2: 2 people, 6pm-8pm
POST /api/bookings
{
  "partySize": 2,
  "bookingTime": 18, // 6pm
  ...
}
# Expected: ✅ Success on DIFFERENT table (T2, T3, etc.)
# Expected: ❌ Error if no other tables available
```

### Test 2: Sequential Same Table
```bash
# Setup: Table T1 (4 seats)
# Booking 1: 5pm-7pm
POST /api/bookings { "bookingTime": 17 }
# Expected: ✅ Success on T1

# Booking 2: 7pm-9pm (immediately after)
POST /api/bookings { "bookingTime": 19 }
# Expected: ✅ Success on T1 (no overlap!)
```

### Test 3: Capacity Query
```bash
# After creating booking at 5pm-7pm for 2 people on T1 (4 seats)
GET /api/tables/1/capacity?date=2025-10-02&hour=17
# Expected: { availableSeats: 0, bookedSeats: 4 }
# NOT: { availableSeats: 2, bookedSeats: 2 } ← Old bug
```

---

This exclusive table booking rule ensures realistic restaurant operations and prevents impossible double-booking scenarios! 🎉
