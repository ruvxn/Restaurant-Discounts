import type { Table, TablePosition, Zone } from '../types';

/**
 * Get circle radius based on seating capacity
 */
export function getRadius(seatingCap: number): number {
  if (seatingCap <= 2) return 25;
  if (seatingCap <= 4) return 35;
  if (seatingCap <= 6) return 45;
  return 55;
}

/**
 * Classify tables into zones based on seating capacity
 */
export function classifyTables(tables: Table[]): Zone[] {
  const small = tables.filter((t) => t.totalCapacity <= 4);
  const medium = tables.filter((t) => t.totalCapacity >= 5 && t.totalCapacity <= 6);
  const large = tables.filter((t) => t.totalCapacity >= 7);

  return [
    { name: 'small', anchorX: 150, anchorY: 150, tables: small, color: '#e0f2fe' },
    { name: 'medium', anchorX: 400, anchorY: 300, tables: medium, color: '#dbeafe' },
    { name: 'large', anchorX: 650, anchorY: 450, tables: large, color: '#bfdbfe' },
  ];
}

/**
 * Place tables initially with random jitter around zone anchors
 */
export function initialPlacement(zones: Zone[]): TablePosition[] {
  const positions: TablePosition[] = [];

  zones.forEach((zone) => {
    zone.tables.forEach((table) => {
      const jitterX = (Math.random() - 0.5) * 80; // ±40px
      const jitterY = (Math.random() - 0.5) * 80;

      positions.push({
        x: zone.anchorX + jitterX,
        y: zone.anchorY + jitterY,
        tableId: table.id,
        zone: zone.name,
        table,
      });
    });
  });

  return positions;
}

/**
 * Resolve collisions between tables using iterative force-based algorithm
 */
export function resolveCollisions(
  positions: TablePosition[],
  maxIterations = 50
): TablePosition[] {
  const result = positions.map((pos) => ({ ...pos }));

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const radiusA = getRadius(a.table.totalCapacity);
        const radiusB = getRadius(b.table.totalCapacity);
        const minDistance = radiusA + radiusB + 25; // 25px padding

        if (distance < minDistance && distance > 0) {
          // Push apart
          const overlap = minDistance - distance;
          const angle = Math.atan2(dy, dx);
          const force = overlap / 2;

          a.x -= Math.cos(angle) * force;
          a.y -= Math.sin(angle) * force;
          b.x += Math.cos(angle) * force;
          b.y += Math.sin(angle) * force;

          moved = true;
        }
      }
    }

    if (!moved) break; // Converged
  }

  return result;
}

/**
 * Apply gentle pull toward zone anchors
 */
export function applyZoneAnchoring(positions: TablePosition[], zones: Zone[]): TablePosition[] {
  const zoneMap = new Map<number, Zone>();
  zones.forEach((zone) => {
    zone.tables.forEach((table) => zoneMap.set(table.id, zone));
  });

  return positions.map((pos) => {
    const zone = zoneMap.get(pos.table.id);
    if (!zone) return pos;

    // Pull 10% toward zone anchor
    const dx = zone.anchorX - pos.x;
    const dy = zone.anchorY - pos.y;

    return {
      ...pos,
      x: pos.x + dx * 0.1,
      y: pos.y + dy * 0.1,
    };
  });
}

/**
 * Generate complete layout for tables
 */
export function generateLayout(tables: Table[]): TablePosition[] {
  console.log('[layoutEngine] Input tables:', tables.length);

  if (tables.length === 0) {
    console.log('[layoutEngine] No tables to layout');
    return [];
  }

  const zones = classifyTables(tables);
  console.log('[layoutEngine] Zones:', zones.map(z => ({ name: z.name, count: z.tables.length })));

  let positions = initialPlacement(zones);
  console.log('[layoutEngine] Initial positions:', positions.length);

  positions = resolveCollisions(positions);
  console.log('[layoutEngine] After collision resolution:', positions.length);

  positions = applyZoneAnchoring(positions, zones);
  console.log('[layoutEngine] Final positions:', positions);

  return positions;
}
