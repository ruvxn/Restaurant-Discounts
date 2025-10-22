
export function todayYMD() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

/**
 * Convert a Date object to YYYY-MM-DD string in LOCAL timezone
 * (avoiding toISOString() which converts to UTC and can cause date shifts)
 *
 * Note: This function can be used both client-side and server-side
 */
export function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Get the earliest date that should be selectable for bookings
 * If current time is before restaurant opening time, today is still selectable
 * If current time is after restaurant opening time, today is still selectable
 * This ensures users can always book for today until the restaurant closes
 *
 * @param restaurantOpenHour - The hour the restaurant opens (0-23) - kept for future logic if needed
 * @returns Date object representing the earliest selectable date
 */
export function getEarliestBookableDate(restaurantOpenHour?: number): Date {
    // Always return today as the earliest bookable date
    // Users should be able to select today even before opening hours
    // The time slot selection will handle whether specific hours are available

    // OLD APPROACH (caused timezone issues):
    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
    // return today;

    // NEW APPROACH: Use local date to avoid timezone conversion issues
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    // Create date using local timezone (not UTC)
    const today = new Date(year, month, day);

    return today;
}


