# Admin Booking Operations

## Overview

Admins have **elevated privileges** for managing bookings, including the ability to bypass customer restrictions.

---

## 🔐 Admin Privileges

### 1. **Unrestricted Cancellations**

**Admin Capability:**
- ✅ Cancel bookings at **any time**
- ✅ Cancel bookings **less than 24 hours** before start time
- ✅ Cancel bookings **minutes before** they start
- ✅ Cancel bookings **retroactively** (past bookings)

**Customer Restriction:**
- ❌ Cannot cancel less than 24 hours before start time
- ❌ Must contact restaurant for last-minute cancellations

---

## 📡 API Endpoints

### Admin Cancellation (No Time Restrictions)
**Endpoint:** `DELETE /api/admin/bookings/[id]/cancel`

**Authentication:** Admin session required

**Request:**
```typescript
DELETE /api/admin/bookings/123/cancel
Headers: {
  'Content-Type': 'application/json'
}
Body: {
  reason?: string  // Optional cancellation reason
}
```

**Response:**
```json
{
  "message": "Booking cancelled successfully by admin",
  "booking": {
    "id": 123,
    "status": "CANCELLED",
    "cancelledAt": "2025-10-02T14:30:00.000Z",
    "cancellationReason": "Cancelled by admin",
    ...
  },
  "note": "Admin cancellation - no time restrictions applied"
}
```

**Key Features:**
- ✅ No 24-hour advance notice required
- ✅ Verifies admin authentication
- ✅ Verifies admin manages this restaurant
- ✅ Records cancellation timestamp and reason
- ✅ Returns full updated booking details

---

### Customer Cancellation (24-Hour Restriction)
**Endpoint:** `DELETE /api/bookings/[id]`

**Authentication:** Customer session required

**Request:**
```typescript
DELETE /api/bookings/123
Body: {
  reason?: string
}
```

**Validation:**
```typescript
// Booking must be at least 24 hours in the future
const now = new Date();
const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

if (booking.startsAt < twentyFourHoursFromNow) {
  throw new Error('Cannot cancel booking less than 24 hours before start time');
}
```

**Error Response (< 24 hours):**
```json
{
  "error": "Cannot cancel booking less than 24 hours before start time. Please contact the restaurant.",
  "status": 400
}
```

---

## 🔄 Comparison: Admin vs Customer

| Feature | Admin | Customer |
|---------|-------|----------|
| **Cancel 48+ hours ahead** | ✅ Yes | ✅ Yes |
| **Cancel 24-48 hours ahead** | ✅ Yes | ✅ Yes |
| **Cancel < 24 hours ahead** | ✅ Yes | ❌ No (error) |
| **Cancel < 2 hours ahead** | ✅ Yes | ❌ No (error) |
| **Cancel past bookings** | ✅ Yes | ❌ No |
| **Modify < 2 hours ahead** | ⚠️ API allows, UI may restrict | ❌ No |
| **View all restaurant bookings** | ✅ Yes | ❌ No (own only) |
| **Create booking for customer** | ✅ Yes | ❌ No |

---

## 💡 Use Cases

### Admin Use Case 1: Emergency Cancellation
```
Scenario: Restaurant has a power outage 30 minutes before service

Timeline:
- Booking: 6:00pm today
- Current time: 5:30pm
- Time until booking: 30 minutes

Admin Action:
DELETE /api/admin/bookings/123/cancel
Body: { reason: "Restaurant power outage - unable to serve" }

Result: ✅ Booking cancelled successfully
Note: Customer endpoint would have rejected this (< 24 hours)
```

### Admin Use Case 2: Staff Error Correction
```
Scenario: Booking was created by mistake for wrong date

Timeline:
- Booking: Tomorrow at 7:00pm
- Current time: Today at 11:00pm
- Time until booking: 20 hours

Admin Action:
DELETE /api/admin/bookings/456/cancel
Body: { reason: "Booking created in error - wrong date" }

Result: ✅ Booking cancelled successfully
Note: Customer endpoint would also reject this (< 24 hours)
```

### Admin Use Case 3: Retroactive Cancellation
```
Scenario: Customer called to cancel but admin forgot to update system

Timeline:
- Booking: Yesterday at 6:00pm (past)
- Current time: Today

Admin Action:
DELETE /api/admin/bookings/789/cancel
Body: { reason: "Late cancellation - customer called day-of" }

Result: ✅ Booking marked as cancelled retroactively
Note: Maintains accurate records for reporting
```

### Customer Use Case: Advance Cancellation
```
Scenario: Customer needs to cancel plans

Timeline:
- Booking: Friday at 7:00pm
- Current time: Monday at 2:00pm
- Time until booking: 4 days

Customer Action:
DELETE /api/bookings/123
Body: { reason: "Change of plans" }

Result: ✅ Booking cancelled successfully (> 24 hours ahead)
```

---

## 🛡️ Security & Authorization

### Admin Endpoint Security

```typescript
// 1. Verify admin authentication
const session = await getAdminSessionFromRequest(req);
if (!session) {
  return { error: 'Unauthorized', status: 401 };
}

// 2. Verify admin manages this restaurant
if (booking.restaurantId !== session.restaurantId) {
  return { error: 'Forbidden', status: 403 };
}

// 3. Perform cancellation (no time checks)
```

### Customer Endpoint Security

```typescript
// 1. Verify customer authentication
const session = await getCustomerSessionFromRequest(req);
if (!session) {
  return { error: 'Unauthorized', status: 401 };
}

// 2. Verify customer owns this booking
if (booking.customerId !== session.customerId) {
  return { error: 'Forbidden', status: 403 };
}

// 3. Check 24-hour rule
if (booking.startsAt < twentyFourHoursFromNow) {
  return { error: 'Cannot cancel < 24 hours', status: 400 };
}

// 4. Perform cancellation
```

---

## 📝 Cancellation Records

Both admin and customer cancellations record:

```typescript
{
  status: 'CANCELLED',
  cancelledAt: Date,          // Timestamp when cancelled
  cancellationReason: string, // Why it was cancelled
  updatedAt: Date            // Last update timestamp
}
```

**Default Reasons:**
- Admin: `"Cancelled by admin"` or custom reason
- Customer: `"Cancelled by customer"` or custom reason

---

## 🎯 Best Practices

### For Admins:
1. ✅ **Always provide a reason** when cancelling
2. ✅ **Communicate with customer** before last-minute cancellations
3. ✅ **Document emergency situations** in cancellation reason
4. ✅ **Use retroactive cancellations** to maintain accurate records
5. ⚠️ **Avoid cancelling** unless absolutely necessary

### For System Design:
1. ✅ **Separate endpoints** for admin vs customer operations
2. ✅ **Log all cancellations** for audit trail
3. ✅ **Notify customers** when admin cancels their booking (future enhancement)
4. ✅ **Track cancellation metrics** (who cancelled, when, why)
5. ✅ **Consider refund logic** for paid bookings (if applicable)

---

## 🔍 Troubleshooting

### Issue: Admin gets "Cannot cancel < 24 hours" error
**Cause:** Using customer endpoint `/api/bookings/[id]` instead of admin endpoint

**Solution:** Use `/api/admin/bookings/[id]/cancel`

```typescript
// ❌ Wrong - uses customer endpoint
fetch(`/api/bookings/${id}`, { method: 'DELETE' })

// ✅ Correct - uses admin endpoint
fetch(`/api/admin/bookings/${id}/cancel`, { method: 'DELETE' })
```

### Issue: "Forbidden: You can only cancel bookings for your restaurant"
**Cause:** Admin trying to cancel booking from different restaurant

**Solution:** Verify booking belongs to your restaurant

### Issue: "Booking already cancelled"
**Cause:** Attempting to cancel a booking that's already cancelled

**Solution:** Check booking status before attempting cancellation

---

## 📊 Example Admin UI Implementation

```typescript
const handleCancelBooking = async (bookingId: number) => {
  // Confirm action
  if (!confirm('Cancel this booking? As admin, you can cancel at any time.')) {
    return;
  }

  try {
    // Use admin endpoint (bypasses 24-hour rule)
    const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Cancelled by admin'
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error);
    }

    toast.success('Booking cancelled successfully');
    refreshBookings();
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

## 🚀 Future Enhancements

Potential improvements:
1. **Email notifications** when admin cancels customer booking
2. **SMS alerts** for last-minute cancellations
3. **Cancellation policies** configurable per restaurant
4. **Refund automation** for prepaid bookings
5. **Cancellation analytics** dashboard
6. **Bulk cancellation** for emergency closures
7. **Cancellation templates** for common reasons

---

This admin cancellation system gives restaurant managers the flexibility to handle real-world situations while maintaining proper records and customer experience! 🎉
