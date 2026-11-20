'use client';

import { useState } from 'react';
import { PREDEFINED_CATEGORIES } from '@/lib/utils/categories';

interface CategoryPickerProps {
  value: string;
  onChange: (category: string) => void;
}

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Category
      </label>
      <div className="flex flex-wrap gap-2">
        {PREDEFINED_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => { onChange(cat); setShowCustom(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              value === cat && !showCustom
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            showCustom
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Custom...
        </button>
      </div>
      {showCustom && (
        <input
          type="text"
          value={PREDEFINED_CATEGORIES.includes(value as typeof PREDEFINED_CATEGORIES[number]) ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type custom category"
          className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoFocus
        />
      )}
    </div>
  );
}
