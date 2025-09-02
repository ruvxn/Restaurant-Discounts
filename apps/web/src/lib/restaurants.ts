export type Restaurant = {
    id: string;
    slug: string;
    name: string;
    open: number;   // opening hour (24h)
    close: number;  // closing hour (24h)
    timezone?: string;
    totalSeats?: number;
  };
  
  const TZ = process.env.TZ || "Australia/Melbourne";
  
  export const RESTAURANTS: Restaurant[] = [
    { id: "1", slug: "sunset-grill", name: "Sunset Grill", open: 10, close: 22, totalSeats: 60, timezone: TZ },
    { id: "2", slug: "pasta-place",  name: "Pasta Place",  open: 11, close: 23, totalSeats: 48, timezone: TZ },
    { id: "3", slug: "sushi-house",  name: "Sushi House",  open: 12, close: 21, totalSeats: 40, timezone: TZ },
  ];
  
  export function getRestaurantById(id: string) {
    return RESTAURANTS.find(r => r.id === id) ?? null;
  }
  
  export function getRestaurantBySlug(slug: string) {
    return RESTAURANTS.find(r => r.slug === slug) ?? null;
  }
  
  export function openingHoursToList(r: Restaurant) {
    const len = Math.max(0, r.close - r.open);
    return Array.from({ length: len }, (_, i) => ({ hour: r.open + i }));
  }
  