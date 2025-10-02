/**
 * Booking error codes for precise error handling
 * Used to provide detailed feedback when bookings fail validation
 */
export enum BookingError {
  CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED',
  NO_TABLES = 'NO_TABLES',
  PARTY_TOO_LARGE = 'PARTY_TOO_LARGE',
  MENU_LOCKED = 'MENU_LOCKED',
  PAST_BOOKING = 'PAST_BOOKING',
  INVALID_TABLE = 'INVALID_TABLE',
  DUPLICATE_BOOKING = 'DUPLICATE_BOOKING',
  INVALID_MENU_ITEMS = 'INVALID_MENU_ITEMS',
}

/**
 * Custom error class for booking validation failures
 * Includes error code and optional details for debugging
 */
export class BookingValidationError extends Error {
  constructor(
    public code: BookingError,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BookingValidationError';
  }
}
