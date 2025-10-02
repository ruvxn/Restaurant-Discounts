'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in dollars
  category?: string;
  imageUrl?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
}

interface MenuItemSelectorProps {
  items: MenuItem[];
  selectedItems: Map<string, { quantity: number; notes?: string }>;
  onItemChange: (itemId: string, quantity: number, notes?: string) => void;
  discountPercent: number;
}

export default function MenuItemSelector({
  items,
  selectedItems,
  onItemChange,
  discountPercent,
}: MenuItemSelectorProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dietaryFilters, setDietaryFilters] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
  });
  const [itemNotes, setItemNotes] = useState<Map<string, string>>(new Map());

  // Keep local notes state in sync with incoming selections (useful when editing existing orders)
  useEffect(() => {
    const syncedNotes = new Map<string, string>();
    selectedItems.forEach((value, key) => {
      if (value.notes) {
        syncedNotes.set(key, value.notes);
      }
    });
    setItemNotes(syncedNotes);
  }, [selectedItems]);

  // Get unique categories
  const categories = ['all', ...new Set(items.map(item => item.category || 'Other'))];

  // Filter items
  const filteredItems = items.filter(item => {
    // Category filter
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }

    // Dietary filters
    if (dietaryFilters.vegetarian && !item.isVegetarian) return false;
    if (dietaryFilters.vegan && !item.isVegan) return false;
    if (dietaryFilters.glutenFree && !item.isGlutenFree) return false;

    return true;
  });

  // Group by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const notes = itemNotes.get(itemId);
    onItemChange(itemId, quantity, notes);
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    const newNotes = new Map(itemNotes);
    newNotes.set(itemId, notes);
    setItemNotes(newNotes);

    const quantity = selectedItems.get(itemId)?.quantity || 0;
    if (quantity > 0) {
      onItemChange(itemId, quantity, notes);
    }
  };

  const calculateItemTotal = (item: MenuItem, quantity: number): number => {
    const subtotal = item.price * quantity;
    const discount = (subtotal * discountPercent) / 100;
    return subtotal - discount;
  };

  const MenuItemCard = ({ item }: { item: MenuItem }) => {
    const selected = selectedItems.get(item.id);
    const quantity = selected?.quantity || 0;

    return (
      <div className={`border rounded-lg overflow-hidden transition-all ${
        quantity > 0 ? 'border-blue-500 shadow-md' : 'border-gray-200'
      }`}>
        {/* Image */}
        {item.imageUrl && (
          <div className="relative h-40 bg-gray-200">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="p-4">
          {/* Item Info */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{item.description}</p>

            {/* Dietary indicators */}
            <div className="flex gap-2 mb-2">
              {item.isVegetarian && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">🌱 Vegetarian</span>
              )}
              {item.isVegan && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">🌿 Vegan</span>
              )}
              {item.isGlutenFree && (
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">GF</span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">${item.price.toFixed(2)}</span>
              {discountPercent > 0 && quantity > 0 && (
                <span className="text-sm text-green-600">
                  Total: ${calculateItemTotal(item, quantity).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => handleQuantityChange(item.id, Math.max(0, quantity - 1))}
              disabled={quantity === 0}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold">{quantity}</span>
            <button
              onClick={() => handleQuantityChange(item.id, quantity + 1)}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>

          {/* Special Instructions */}
          {quantity > 0 && (
            <textarea
              placeholder="Special requests (e.g., no onions, extra spicy)"
              value={itemNotes.get(item.id) || ''}
              onChange={(e) => handleNotesChange(item.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* View Mode & Category Filter */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              List
            </button>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Dietary Filters */}
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dietaryFilters.vegetarian}
              onChange={(e) => setDietaryFilters({ ...dietaryFilters, vegetarian: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">🌱 Vegetarian</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dietaryFilters.vegan}
              onChange={(e) => setDietaryFilters({ ...dietaryFilters, vegan: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">🌿 Vegan</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dietaryFilters.glutenFree}
              onChange={(e) => setDietaryFilters({ ...dietaryFilters, glutenFree: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">GF Gluten-Free</span>
          </label>
        </div>
      </div>

      {/* Menu Items */}
      {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
        <div key={category} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{category}</h2>
          <div className={`grid gap-4 ${
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          }`}>
            {categoryItems.map(item => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No items match your filters</p>
        </div>
      )}
    </div>
  );
}
