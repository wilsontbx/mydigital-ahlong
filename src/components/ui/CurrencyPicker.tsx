'use client';

import { useState } from 'react';
import { POPULAR_CURRENCIES } from '@/lib/utils/currencies';

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

export default function CurrencyPicker({ value, onChange, label }: CurrencyPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const isPopular = POPULAR_CURRENCIES.some((c) => c.code === value);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <select
        value={isPopular && !showCustom ? value : '__custom__'}
        onChange={(e) => {
          if (e.target.value === '__custom__') {
            setShowCustom(true);
          } else {
            setShowCustom(false);
            onChange(e.target.value);
          }
        }}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {POPULAR_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code} — {c.name}
          </option>
        ))}
        <option value="__custom__">Other...</option>
      </select>
      {showCustom && (
        <input
          type="text"
          value={isPopular ? '' : value}
          onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="e.g. BRL"
          maxLength={3}
          className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-wider font-mono"
          autoFocus
        />
      )}
    </div>
  );
}
