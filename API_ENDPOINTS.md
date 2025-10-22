# API Endpoints Guide

This document summarizes the Next.js API routes under `apps/web/app/api`. It is intended to help developers find the right entry point, understand which helpers are involved, and identify any authentication or data-shape expectations quickly.

## Key Conventions
- All endpoints return JSON responses and will emit `{ error, ... }` payloads with an HTTP error status when something goes wrong.
- Session cookies (`session`) are used for authentication. Helper utilities live in `@/lib/auth` for customers and `@/lib/admin-auth` for admins.
- Booking utilities (pricing, availability, locking) are implemented in `@/lib/booking-utils`.

## Authentication & Session

### `POST /api/auth/signup`
- **Auth**: Public.
- **Body**: `{ email, password, role? ("CUSTOMER"|"ADMIN"), name?, restaurantId?, interests?[] }`. `restaurantId` is required when creating an admin.
- **Behavior**: Creates an `account` record, plus either `customer` or `admin` profile, hashes the password with bcrypt, and writes a session cookie so the caller is logged in immediately.
- **Response**: `{ accountId, email, role, customer|null, admin|null }`.

### `POST /api/auth/login`
- **Auth**: Public.
- **Body**: `{ email, password }`.
- **Behavior**: Validates credentials, augments the session with role-specific profile data (admin/customer), and persists it via `cookies()`.
- **Response**: Mirrors the AuthContext shape: `{ accountId, email, role, customer|null, admin|null }`.

### `POST /api/auth/logout`
- **Auth**: Requires an existing session cookie (no payload).
- **Behavior**: Deletes the `session` cookie.
- **Response**: `{ success: true }`.

### `GET /api/auth/me`
- **Auth**: Requires session cookie.
- **Behavior**: Expands the session into the full account record, including related `customer` or `admin + restaurant` information.
- **Response**: `{ accountId, email, role, customer, admin, restaurant, restaurantName }` or `401` if unauthenticated.

## Customer-Facing Booking APIs

### `POST /api/bookings`
- **Auth**: Requires `CUSTOMER` session (`requireAuth('CUSTOMER')`).
- **Body** *(validated via `createBookingSchema`)*:
  - `restaurantId`, `bookingDate` (`YYYY-MM-DD`), `bookingTime` (0–23),
  - `partySize` (1–20),
  - optional `menuItems[]` of `{ menuItemId, quantity, notes? }`,
  - optional `tableId` if the guest pre-selects a table.
- **Behavior**: Ensures the time is in the future, verifies restaurant and menu item ownership, runs pre-transaction validation, optionally respects table selection, enforces menu locks, calculates discounts via `getDiscountForDateTime`, and creates booking + items inside a Prisma transaction.
- **Response**: `201` with `{ message, booking, savings }`. The booking includes restaurant, table, customer, and menu item relations. Emits specific error codes from `BookingError` on validation failures.

### `/api/bookings/[id]`
- **Auth**: No explicit guard is enforced in the current implementation.
- **GET**: Returns `{ booking }` with restaurant, table, customer, and menu item details or `404` if missing.
- **PATCH**: Accepts any combination of `partySize`, `bookingDate`, `bookingTime`, `menuItems[]` (see `updateBookingSchema`). Recomputes availability, discounts, and menu locks as needed. Responds with `{ message, booking }`.
- **DELETE**: Soft-cancels a booking if it is ≥24h away (customer rule), accepts an optional `{ reason }` body, and returns `{ message, booking }`.

### `GET /api/bookings/user/[customerId]`
- **Auth**: None enforced (callers must supply the numeric `customerId`).
- **Behavior**: Fetches all bookings for the customer, splits them into `upcoming` and `past` (cancelled and historical), attaches restaurant info and ordered menu items.
- **Response**: `{ upcoming[], past[], totalBookings, totalSavings }`.

### `/api/customer/profile`
- **Auth**: Requires `CUSTOMER` session.
- **GET**: Returns `{ name, email, birthday, phone, interests }` for the logged-in customer.
- **PATCH**: Accepts `{ name, email, birthday?, phone?, interests?[] }`, updates both `customer` and `account` records, and responds with `{ message, ...updatedFields }`.

### `GET /api/customer/list`
- **Auth**: Requires admin session (via `getAdminSessionFromRequest`).
- **Behavior**: Lists customers with their account email sorted alphabetically.
- **Response**: `{ customers: [{ id, name, email }] }`.

## Restaurant Information & Capacity

### `GET /api/restaurants`
- **Auth**: Public.
- **Behavior**: Returns basic restaurant metadata plus the maximum accepted discount for the current day (`todayYMD`).
- **Response**: `[ { id, slug, name, open, close, totalSeats, googleRating, averageBill, distanceKm, category, timezone, maxDiscount } ]`.

### `GET /api/restaurants/[id]`
- **Auth**: Public.
- **Behavior**: Returns full restaurant detail with active menu items and table list.
- **Response**: `{ id, slug, name, open, close, totalSeats, googleRating, averageBill, distanceKm, category, timezone, tables[], menuItems[] }`.

### `/api/restaurants/[id]/discounts`
- **Auth**: Public for GET; POST expects a trusted caller (no guard present).
- **GET**: Optional `?date=YYYY-MM-DD`, defaults to today. Returns `{ discounts: [{ hour, discountPercentage }] }`, falling back to a default schedule if none exist in `acceptedDiscount`.
- **POST**: Body is an array like `[{ time: "18:00", discount: 25 }, ...]`. Overwrites the given day for the restaurant in `acceptedDiscount`.
- **Response**: `{ ok: true, saved }` on success.

### `GET /api/restaurants/[id]/availability`
- **Auth**: Public.
- **Query**: `date`, `hour`.
- **Behavior**: Uses `calculateAvailableSeats` to compute seats for a 2-hour window.
- **Response**: `{ availableSeats, totalCapacity, bookedSeats, occupancyRate, timeWindow }`.

### `GET /api/restaurants/[id]/capacity`
- **Auth**: Public.
- **Query**: `date`, `hour`.
- **Behavior**: Combines restaurant-level availability with per-table capacity via `getRestaurantTablesAvailability`.
- **Response**: `{ restaurant: {...}, tables: [...], timeWindow, menuLock }`.

### `GET /api/restaurants/[id]/tables/[tableId]/guests`
- **Auth**: Public.
- **Query**: `date`, `hour`.
- **Behavior**: Aggregates overlapping bookings on the table, sums party sizes, and combines customer interests (title-cased) falling back to a placeholder when empty.
- **Response**: `{ tableId, tableLabel, totalGuests, interests[], hasGenericFallback, bookingsCount }`.

### `GET /api/tables/[id]/capacity`
- **Auth**: Public.
- **Query**: `date`, `hour`.
- **Behavior**: Returns capacity metrics for a single table using `getTableAvailableCapacity`.
- **Response**: `{ tableId, availableSeats, totalCapacity, bookedSeats, isAvailable, occupancyRate, timeWindow }`.

## Admin Booking Management

### `GET /api/admin/bookings`
- **Auth**: Admin session required.
- **Query**: `date`, `status` (`upcoming|past|all`), `bookingStatus` (`BOOKED|CANCELLED|COMPLETED|all`), `limit`.
- **Behavior**: Filters bookings for the admin’s restaurant, includes customer, table, and item data, and computes summary metrics.
- **Response**: `{ bookings, summary: { totalBookings, totalRevenue, totalSavings, totalGuests } }`.

### `POST /api/admin/bookings/create`
- **Auth**: Admin session required (operates on the admin’s restaurant).
- **Body**: `{ customerId, bookingDate, bookingTime, partySize, menuItems[] }`; menu items must belong to the restaurant.
- **Behavior**: Shares most of the customer booking flow, including table assignment, menu locks, and discount calculations, but enforces at least one menu item.
- **Response**: `201` with `{ message, booking }`.

### `DELETE /api/admin/bookings/[id]/cancel`
- **Auth**: Admin session required.
- **Body**: Optional `{ reason }`.
- **Behavior**: Cancels any booking for the admin’s restaurant without the 24-hour restriction applied to customers.
- **Response**: `{ message, booking, note }`.

## Admin Discounts & Dashboard

### `GET /api/admin/discounts`
- **Auth**: Admin session required.
- **Query**: Optional `date=YYYY-MM-DD` (defaults to `todayYMD`).
- **Behavior**: Lists accepted discounts for the admin’s restaurant, adding `bookingsReceived` counts per slot.
- **Response**: `{ date, discounts: [{ id, time, hour, discount, bookingsReceived, createdAt, updatedAt }] }`.

### `PATCH /api/admin/discounts`
- **Auth**: Admin session required.
- **Body**: `{ updates: [{ id, discount }] }`.
- **Behavior**: Validates ownership and updates each discount percentage.
- **Response**: `{ message, updated }`.

### `/api/admin/discounts/[id]`
- **Auth**: Admin session required.
- **GET**: Returns `{ discount }` when the slot belongs to the admin’s restaurant.
- **PUT**: Body `{ discount, overrideReason? }` (5–50%). Updates the percentage and logs the override metadata.

### `POST /api/admin/refresh-discounts`
- **Auth**: Admin session required.
- **Body**: `{ startDate?, days?=7 }`.
- **Behavior**: Looks up the admin’s restaurant, calls the ML model server (`MODEL_SERVER_URL`) for each day, wipes existing slots for that day, and inserts new `acceptedDiscount` rows. Collects success/failure statistics.
- **Response**: `{ message, totalSlotsUpdated, results[], restaurantName }`.

### `GET /api/admin/dashboard`
- **Auth**: Admin session required.
- **Behavior**: Aggregates today’s performance metrics, upcoming bookings (next 7 days), average discounts, top time slots, seating stats, and total/completed bookings.
- **Response**: `{ today: {...}, upcoming: {...}, popularTimeSlots[], stats: {...} }`.

### `GET /api/admin/menu`
- **Auth**: Admin session required.
- **Behavior**: Lists menu items for the admin’s restaurant sorted by category/name.
- **Response**: `{ menuItems: [{ id, name, priceCents, category }] }`.

## Automation & Model Integration

### `POST /api/admin/refresh`
- **Auth**: Protected by `x-cron-secret` header (`process.env.CRON_SECRET`); intended for scheduled jobs rather than logged-in admins.
- **Query**: Optional `?date=YYYY-MM-DD` (defaults to today).
- **Behavior**: Iterates through `RESTAURANTS`, calls the internal model server (`callModelServer`) with opening hours/context, sorts and normalizes discounts, and persists them via `saveAccepted`. Falls back to `defaultHours` on failure.
- **Response**: `{ date, results: [{ restaurant, saved, model_version?, fallback?, error? }] }`.

## Public Discount Snapshot

### `GET /api/discounts`
- **Auth**: Public.
- **Behavior**: Returns `defaultHours` from `@/src/lib/store`; primarily used as a fallback or static schedule.
- **Response**: `[ { time: "08:00", discount: 15 }, ... ]`.

