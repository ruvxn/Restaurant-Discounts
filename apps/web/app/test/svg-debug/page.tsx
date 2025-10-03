'use client';

import { useState } from 'react';

// Simple inline test without imports to isolate SVG rendering
export default function SVGDebugPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Simple test data
  const tables = [
    { id: 1, label: 'T1', x: 200, y: 150 },
    { id: 2, label: 'T2', x: 400, y: 150 },
    { id: 3, label: 'T3', x: 600, y: 150 },
    { id: 4, label: 'T4', x: 300, y: 350 },
    { id: 5, label: 'T5', x: 500, y: 350 },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <h1>SVG Debug Test</h1>
      <p>If you can see circles below, SVG is rendering correctly.</p>

      <div style={{ border: '2px solid #000', display: 'inline-block', marginTop: '1rem' }}>
        <svg width="800" height="600" viewBox="0 0 800 600" style={{ background: '#f0f0f0' }}>
          {/* Test circles */}
          {tables.map((table) => (
            <g
              key={table.id}
              transform={`translate(${table.x}, ${table.y})`}
              onClick={() => setSelectedId(table.id)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                r={40}
                fill={selectedId === table.id ? '#2196f3' : '#4caf50'}
                stroke="#333"
                strokeWidth={2}
              />
              <text
                textAnchor="middle"
                y={5}
                fontSize="18"
                fontWeight="bold"
                fill="#000"
              >
                {table.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {selectedId && (
        <p style={{ marginTop: '1rem', color: '#2196f3', fontWeight: 'bold' }}>
          Selected: Table {selectedId}
        </p>
      )}
    </div>
  );
}
