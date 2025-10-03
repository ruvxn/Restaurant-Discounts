'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Table, TablePosition, GuestInterests } from './types';
import { generateLayout } from './utils/layoutEngine';
import { guestInterestsCache } from './utils/cacheManager';
import styles from './SeatingSelector.module.css';

interface SeatingSelectorProps {
  restaurantId: number;
  date: string; // ISO date string (e.g., "2025-10-02")
  hour: number; // 0-23
  tables: Table[];
  selectedTableId?: number;
  onTableSelect: (table: Table) => void;
  className?: string;
}

export default function SeatingSelector({
  restaurantId,
  date,
  hour,
  tables,
  selectedTableId,
  onTableSelect,
  className = '',
}: SeatingSelectorProps) {
  const [positions, setPositions] = useState<TablePosition[]>([]);
  const [hoveredTableId, setHoveredTableId] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [guestInterests, setGuestInterests] = useState<Map<number, GuestInterests>>(new Map());
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate layout on mount or when tables change
  useEffect(() => {
    console.log('[SeatingSelector] Generating layout for tables:', tables);
    const layout = generateLayout(tables);
    console.log('[SeatingSelector] Generated positions:', layout);
    setPositions(layout);
  }, [tables]);

  // Clear cache when time slot changes
  useEffect(() => {
    guestInterestsCache.clear();
    setGuestInterests(new Map());
  }, [date, hour]);

  // Fetch guest interests for a table
  const fetchGuestInterests = useCallback(
    async (tableId: number) => {
      // Check cache first
      const cached = guestInterestsCache.get(tableId, date, hour);
      if (cached) {
        setGuestInterests((prev) => new Map(prev).set(tableId, cached));
        return;
      }

      // Check if already loading
      if (guestInterestsCache.isLoading(tableId, date, hour)) {
        return;
      }

      // Mark as loading and fetch
      guestInterestsCache.setLoading(tableId, date, hour, true);

      try {
        const response = await fetch(
          `/api/restaurants/${restaurantId}/tables/${tableId}/guests?date=${date}&hour=${hour}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch guest interests');
        }

        const data: GuestInterests = await response.json();

        // Store in cache and state
        guestInterestsCache.set(tableId, date, hour, data);
        setGuestInterests((prev) => new Map(prev).set(tableId, data));
      } catch (error) {
        console.error(`Error fetching guest interests for table ${tableId}:`, error);
      } finally {
        guestInterestsCache.setLoading(tableId, date, hour, false);
      }
    },
    [restaurantId, date, hour]
  );

  // Handle mouse enter - fetch guest interests if table has bookings
  const handleMouseEnter = (table: Table, event: React.MouseEvent) => {
    setHoveredTableId(table.id);

    // Calculate tooltip position relative to container
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: event.clientX - containerRect.left + 15,
        y: event.clientY - containerRect.top - 10,
      });
    }

    // Only fetch if table has bookings (bookedSeats > 0)
    if (table.bookedSeats > 0) {
      fetchGuestInterests(table.id);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredTableId !== null && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: event.clientX - containerRect.left + 15,
        y: event.clientY - containerRect.top - 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTableId(null);
    setTooltipPos(null);
  };

  const handleTableClick = (table: Table) => {
    if (table.isAvailable) {
      onTableSelect(table);
    }
  };

  // Get table state class
  const getTableStateClass = (table: Table): string => {
    if (selectedTableId === table.id) return styles.selected;
    if (!table.isAvailable) return styles.unavailable;
    if (table.menuLocked) return styles.locked;
    if (table.occupancyRate >= 100) return styles.full;
    return styles.available;
  };

  // SVG dimensions
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 600;
  const NODE_RADIUS = 40;

  // Get zone colors
  const getZoneColor = (zone: string): string => {
    const colors: Record<string, string> = {
      small: '#e0f2fe',
      medium: '#dbeafe',
      large: '#bfdbfe',
    };
    return colors[zone] || colors.medium;
  };

  // Group positions by zone for background rendering
  const zoneGroups = positions.reduce((acc, pos) => {
    if (!acc[pos.zone]) {
      acc[pos.zone] = [];
    }
    acc[pos.zone].push(pos);
    return acc;
  }, {} as Record<string, TablePosition[]>);

  const hoveredTable = hoveredTableId !== null ? tables.find(t => t.id === hoveredTableId) : null;

  return (
    <div ref={containerRef} className={`${styles.container} ${className}`}>
      <svg
        ref={svgRef}
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className={styles.svg}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Zone background circles */}
        {Object.entries(zoneGroups).map(([zone, zonePosns]) => {
          if (zonePosns.length === 0) return null;
          // Calculate zone center
          const centerX = zonePosns.reduce((sum, p) => sum + p.x, 0) / zonePosns.length;
          const centerY = zonePosns.reduce((sum, p) => sum + p.y, 0) / zonePosns.length;
          const radius = 120;

          return (
            <circle
              key={zone}
              cx={centerX}
              cy={centerY}
              r={radius}
              fill={getZoneColor(zone)}
              opacity={0.2}
              className={styles.zoneBackground}
            />
          );
        })}

        {/* Table nodes */}
        {positions.map((pos) => {
          const table = tables.find((t) => t.id === pos.tableId);
          if (!table) return null;

          const isHovered = hoveredTableId === table.id;
          const stateClass = getTableStateClass(table);

          return (
            <g
              key={table.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseEnter={(e) => handleMouseEnter(table, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleTableClick(table)}
            >
              <g
                className={`${styles.tableNode} ${stateClass} ${isHovered ? styles.hovered : ''}`}
                style={{ cursor: table.isAvailable ? 'pointer' : 'not-allowed' }}
              >
                {/* Table circle */}
                <circle
                  r={NODE_RADIUS}
                  className={styles.tableCircle}
                  strokeWidth={selectedTableId === table.id ? 4 : 2}
                />

                {/* Table label */}
                <text
                  y={-5}
                  textAnchor="middle"
                  className={styles.tableLabel}
                  fontSize="16"
                  fontWeight="bold"
                >
                  {table.label}
                </text>

                {/* Capacity info */}
                <text
                  y={10}
                  textAnchor="middle"
                  className={styles.capacityText}
                  fontSize="12"
                >
                  {table.availableSeats}/{table.totalCapacity}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Tooltip rendered outside SVG */}
      {hoveredTable && tooltipPos && (
        <div
          className={styles.tooltip}
          style={{
            position: 'absolute',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <div className={styles.tooltipHeader}>
            <strong>{hoveredTable.label}</strong>
          </div>
          <div className={styles.tooltipBody}>
            <div className={styles.tooltipRow}>
              <span>Available:</span>
              <span>{hoveredTable.availableSeats} seats</span>
            </div>
            <div className={styles.tooltipRow}>
              <span>Capacity:</span>
              <span>{hoveredTable.totalCapacity} seats</span>
            </div>
            <div className={styles.tooltipRow}>
              <span>Occupancy:</span>
              <span>{hoveredTable.occupancyRate}%</span>
            </div>
            {hoveredTable.menuLocked && hoveredTable.lockKey && (
              <div className={styles.tooltipRow}>
                <span>Menu Lock:</span>
                <span className={styles.lockKey}>
                  {hoveredTable.lockMenuName ?? hoveredTable.lockKey}
                </span>
              </div>
            )}

            {/* Guest interests */}
            {hoveredTable.bookedSeats > 0 && guestInterests.has(hoveredTable.id) && (
              <div className={styles.guestInterestsSection}>
                <div className={styles.guestInterestsHeader}>
                  Current Guests ({guestInterests.get(hoveredTable.id)!.totalGuests})
                </div>
                <div className={styles.interestsList}>
                  {guestInterests.get(hoveredTable.id)!.interests.map((interest, idx) => (
                    <span key={idx} className={styles.interestTag}>
                      {interest}
                    </span>
                  ))}
                </div>
                {guestInterests.get(hoveredTable.id)!.hasGenericFallback && (
                  <div className={styles.fallbackNote}>
                    (No specific interests recorded)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.available}`}></span>
          <span>Available</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.locked}`}></span>
          <span>Menu Locked</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.full}`}></span>
          <span>Full</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.unavailable}`}></span>
          <span>Unavailable</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.selected}`}></span>
          <span>Selected</span>
        </div>
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.debugInfo}>
          <small>
            Tables: {tables.length} | Cached: {guestInterestsCache.getCachedKeys().length}
          </small>
        </div>
      )}
    </div>
  );
}
