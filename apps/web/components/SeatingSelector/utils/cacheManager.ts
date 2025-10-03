import type { GuestInterests } from '../types';

/**
 * Cache manager for guest interests data
 * Caches by tableId, date, and hour to avoid redundant API calls
 */
class GuestInterestsCache {
  private cache = new Map<string, GuestInterests>();
  private loading = new Set<string>();

  /**
   * Generate cache key from table ID, date, and hour
   */
  getCacheKey(tableId: number, date: string, hour: number): string {
    return `${tableId}_${date}_${hour}`;
  }

  /**
   * Get cached data if available
   */
  get(tableId: number, date: string, hour: number): GuestInterests | null {
    const key = this.getCacheKey(tableId, date, hour);
    return this.cache.get(key) || null;
  }

  /**
   * Store data in cache
   */
  set(tableId: number, date: string, hour: number, data: GuestInterests): void {
    const key = this.getCacheKey(tableId, date, hour);
    this.cache.set(key, data);
  }

  /**
   * Check if data is currently being loaded
   */
  isLoading(tableId: number, date: string, hour: number): boolean {
    const key = this.getCacheKey(tableId, date, hour);
    return this.loading.has(key);
  }

  /**
   * Mark data as loading or not loading
   */
  setLoading(tableId: number, date: string, hour: number, loading: boolean): void {
    const key = this.getCacheKey(tableId, date, hour);
    if (loading) {
      this.loading.add(key);
    } else {
      this.loading.delete(key);
    }
  }

  /**
   * Clear all cached data (called when time slot changes)
   */
  clear(): void {
    this.cache.clear();
    this.loading.clear();
  }

  /**
   * Get all cached keys (for debugging)
   */
  getCachedKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Singleton instance
export const guestInterestsCache = new GuestInterestsCache();
