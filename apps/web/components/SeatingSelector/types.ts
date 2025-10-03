/**
 * Table information from capacity API
 */
export interface Table {
  id: number;
  label: string;
  totalCapacity: number;
  availableSeats: number;
  bookedSeats: number;
  isAvailable: boolean;
  occupancyRate: number;
  menuLocked: boolean;
  lockKey: string | null;
  lockMenuName?: string | null;
}

/**
 * Table position in SVG coordinate space
 */
export interface TablePosition {
  x: number;
  y: number;
  tableId: number;
  zone: string;
  table: Table;
}

/**
 * Guest interests data from API
 */
export interface GuestInterests {
  tableId: number;
  tableLabel: string;
  totalGuests: number;
  interests: string[];
  hasGenericFallback: boolean;
  bookingsCount: number;
}

/**
 * Zone for grouping tables by capacity
 */
export interface Zone {
  name: 'small' | 'medium' | 'large';
  anchorX: number;
  anchorY: number;
  tables: Table[];
  color: string;
}
