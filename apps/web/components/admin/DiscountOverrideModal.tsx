'use client';

import { useState } from 'react';

interface DiscountOverrideModalProps {
  discount: {
    id: number;
    time: string;
    hour: number;
    discount: number;
    bookingsReceived: number;
  };
  onClose: () => void;
  onSave: () => void;
}

export default function DiscountOverrideModal({
  discount,
  onClose,
  onSave,
}: DiscountOverrideModalProps) {
  const [newDiscount, setNewDiscount] = useState(discount.discount);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (newDiscount < 5 || newDiscount > 50) {
      setError('Discount must be between 5% and 50%');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/discounts/${discount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discount: newDiscount,
          overrideReason: reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update discount');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  // Calculate example pricing impact
  const examplePrice = 50; // $50 meal
  const originalDiscountAmount = (examplePrice * discount.discount) / 100;
  const newDiscountAmount = (examplePrice * newDiscount) / 100;
  const originalFinalPrice = examplePrice - originalDiscountAmount;
  const newFinalPrice = examplePrice - newDiscountAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">Override Discount</h2>
            <p className="text-gray-600">{discount.time}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Current Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Current AI Discount</p>
              <p className="text-2xl font-bold text-blue-600">{discount.discount}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bookings Received</p>
              <p className="text-2xl font-bold">{discount.bookingsReceived}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Discount Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Discount Percentage
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={newDiscount}
              onChange={(e) => setNewDiscount(parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="w-20 text-center">
              <input
                type="number"
                min="5"
                max="50"
                value={newDiscount}
                onChange={(e) => setNewDiscount(parseInt(e.target.value))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-center font-bold text-lg"
              />
              <p className="text-xs text-gray-500">%</p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5% (minimum)</span>
            <span>50% (maximum)</span>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Override (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g., Special event, slow period, competition..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Pricing Preview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">Pricing Impact Preview (on $50 order)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">AI Discount ({discount.discount}%)</p>
              <p className="text-sm line-through text-gray-500">${examplePrice.toFixed(2)}</p>
              <p className="text-lg font-bold">${originalFinalPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">New Discount ({newDiscount}%)</p>
              <p className="text-sm line-through text-gray-500">${examplePrice.toFixed(2)}</p>
              <p className="text-lg font-bold text-green-600">${newFinalPrice.toFixed(2)}</p>
            </div>
          </div>
          {newDiscount !== discount.discount && (
            <p className="mt-2 text-xs text-gray-600">
              {newDiscount > discount.discount ? (
                <span className="text-green-600">
                  ↑ Customers save ${(newDiscountAmount - originalDiscountAmount).toFixed(2)} more
                </span>
              ) : (
                <span className="text-orange-600">
                  ↓ Customers save ${(originalDiscountAmount - newDiscountAmount).toFixed(2)} less
                </span>
              )}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || newDiscount === discount.discount}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Override'}
          </button>
        </div>
      </div>
    </div>
  );
}
