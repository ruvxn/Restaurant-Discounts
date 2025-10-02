'use client';

import { useState, useEffect } from 'react';

interface Table {
  id: number;
  label: string;
  seatingCap: number;
  currentOccupancy: number;
}

interface OccupancyChartProps {
  restaurantId?: number;
  date?: string;
  hour?: number;
}

export default function OccupancyChart({
  restaurantId,
  date = new Date().toISOString().split('T')[0],
  hour = new Date().getHours(),
}: OccupancyChartProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOccupancy();
    // Refresh every 30 seconds
    const interval = setInterval(fetchOccupancy, 30000);
    return () => clearInterval(interval);
  }, [restaurantId, date, hour]);

  const fetchOccupancy = async () => {
    try {
      // For now, we'll fetch tables and calculate occupancy manually
      // In a real app, you might have a dedicated occupancy API endpoint

      // This is a placeholder - in production, you'd fetch actual occupancy data
      // For demonstration, we'll create mock data
      setTables([
        { id: 1, label: 'T1', seatingCap: 4, currentOccupancy: 4 },
        { id: 2, label: 'T2', seatingCap: 4, currentOccupancy: 2 },
        { id: 3, label: 'T3', seatingCap: 6, currentOccupancy: 0 },
        { id: 4, label: 'T4', seatingCap: 8, currentOccupancy: 6 },
        { id: 5, label: 'T5', seatingCap: 2, currentOccupancy: 0 },
        { id: 6, label: 'T6', seatingCap: 4, currentOccupancy: 4 },
        { id: 7, label: 'T7', seatingCap: 6, currentOccupancy: 3 },
        { id: 8, label: 'T8', seatingCap: 8, currentOccupancy: 0 },
      ]);

      setLoading(false);
    } catch (err: any) {
      console.error('Occupancy fetch error:', err);
      setError(err.message || 'Failed to load occupancy data');
      setLoading(false);
    }
  };

  const getOccupancyColor = (current: number, capacity: number): string => {
    const percentage = (current / capacity) * 100;
    if (percentage === 0) return 'bg-gray-200 border-gray-300';
    if (percentage < 50) return 'bg-yellow-200 border-yellow-400';
    if (percentage < 100) return 'bg-orange-200 border-orange-400';
    return 'bg-red-200 border-red-400';
  };

  const getOccupancyLabel = (current: number, capacity: number): string => {
    if (current === 0) return 'Empty';
    if (current < capacity) return 'Partial';
    return 'Full';
  };

  const totalCapacity = tables.reduce((sum, t) => sum + t.seatingCap, 0);
  const totalOccupied = tables.reduce((sum, t) => sum + t.currentOccupancy, 0);
  const overallPercentage = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-600">Loading occupancy data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold mb-1">Table Occupancy</h3>
          <p className="text-sm text-gray-600">Real-time table usage visualization</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{overallPercentage.toFixed(0)}%</p>
          <p className="text-sm text-gray-600">
            {totalOccupied} / {totalCapacity} seats
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
          <span>Empty</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-200 border border-orange-400 rounded"></div>
          <span>Almost Full</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
          <span>Full</span>
        </div>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-4 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${getOccupancyColor(
              table.currentOccupancy,
              table.seatingCap
            )}`}
          >
            <div className="text-center">
              <p className="text-lg font-bold mb-1">{table.label}</p>
              <p className="text-sm font-medium mb-2">
                {table.currentOccupancy} / {table.seatingCap} seats
              </p>
              <p className="text-xs font-semibold">
                {getOccupancyLabel(table.currentOccupancy, table.seatingCap)}
              </p>
            </div>

            {/* Visual seat representation */}
            <div className="mt-3 flex flex-wrap gap-1 justify-center">
              {Array.from({ length: table.seatingCap }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < table.currentOccupancy ? 'bg-gray-700' : 'bg-gray-300'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">Empty Tables</p>
          <p className="text-2xl font-bold">
            {tables.filter((t) => t.currentOccupancy === 0).length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Partial Tables</p>
          <p className="text-2xl font-bold">
            {
              tables.filter(
                (t) => t.currentOccupancy > 0 && t.currentOccupancy < t.seatingCap
              ).length
            }
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Full Tables</p>
          <p className="text-2xl font-bold">
            {tables.filter((t) => t.currentOccupancy === t.seatingCap).length}
          </p>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-gray-500">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
}
