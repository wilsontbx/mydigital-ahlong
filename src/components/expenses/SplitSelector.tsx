'use client';

import { useState, useEffect } from 'react';
import { calculateEqualSplit, validateExactSplit, validatePercentages } from '@/lib/utils/splitCalculator';
import { formatCurrency } from '@/lib/utils/currency';
import type { GroupMember, SplitType } from '@/lib/types';

interface SplitSelectorProps {
  splitType: SplitType;
  onSplitTypeChange: (type: SplitType) => void;
  amount: number;
  currency: string;
  participants: string[];
  members: Record<string, GroupMember>;
  splits: Record<string, number>;
  onSplitsChange: (splits: Record<string, number>) => void;
}

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Equal' },
  { value: 'exact', label: 'Exact Amount' },
  { value: 'percentage', label: 'Percentage' },
];

export default function SplitSelector({
  splitType,
  onSplitTypeChange,
  amount,
  currency,
  participants,
  members,
  splits,
  onSplitsChange,
}: SplitSelectorProps) {
  const [percentages, setPercentages] = useState<Record<string, number>>(() =>
    participants.reduce((acc, uid) => {
      // When editing a percentage split, derive percentages from the saved amounts
      if (splitType === 'percentage' && amount > 0 && splits[uid] !== undefined) {
        acc[uid] = Math.round((splits[uid] / amount) * 100 * 100) / 100;
      } else {
        acc[uid] = participants.length > 0 ? Math.round((100 / participants.length) * 100) / 100 : 0;
      }
      return acc;
    }, {} as Record<string, number>)
  );

  useEffect(() => {
    if (splitType === 'equal' && participants.length > 0 && amount > 0) {
      onSplitsChange(calculateEqualSplit(amount, participants));
    }
  }, [splitType, amount, participants.join(',')]);

  useEffect(() => {
    // Update percentages when participants change
    const newPct: Record<string, number> = {};
    const equalPct = participants.length > 0 ? Math.round((100 / participants.length) * 100) / 100 : 0;
    participants.forEach((uid) => {
      newPct[uid] = percentages[uid] ?? equalPct;
    });
    setPercentages(newPct);
  }, [participants.join(',')]);

  const handleExactChange = (uid: string, value: string) => {
    const num = parseFloat(value) || 0;
    onSplitsChange({ ...splits, [uid]: num });
  };

  const handlePercentageChange = (uid: string, value: string) => {
    const pct = parseFloat(value) || 0;
    const newPercentages = { ...percentages, [uid]: pct };
    setPercentages(newPercentages);
    const newSplits: Record<string, number> = {};
    for (const [id, p] of Object.entries(newPercentages)) {
      newSplits[id] = Math.round((amount * p / 100) * 100) / 100;
    }
    onSplitsChange(newSplits);
  };

  const exactValidation = splitType === 'exact' ? validateExactSplit(splits, amount) : null;
  const pctValidation = splitType === 'percentage' ? validatePercentages(percentages) : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Split Type
      </label>
      <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden mb-4">
        {SPLIT_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onSplitTypeChange(type.value)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              splitType === type.value
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {participants.map((uid) => (
          <div key={uid} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[120px] truncate">
              {members[uid]?.displayName || uid}
            </span>

            {splitType === 'equal' ? (
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(splits[uid] || 0, currency)}
              </span>
            ) : splitType === 'exact' ? (
              <input
                type="number"
                step="0.01"
                min="0"
                value={splits[uid] || ''}
                onChange={(e) => handleExactChange(uid, e.target.value)}
                className="w-32 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="0.00"
              />
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={percentages[uid] || ''}
                  onChange={(e) => handlePercentageChange(uid, e.target.value)}
                  className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0"
                />
                <span className="text-sm text-gray-500">%</span>
                <span className="text-xs text-gray-400 ml-1">
                  ({formatCurrency(splits[uid] || 0, currency)})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {splitType === 'exact' && exactValidation && !exactValidation.valid && (
        <p className="mt-2 text-sm text-red-500">
          {exactValidation.difference > 0
            ? `${formatCurrency(exactValidation.difference, currency)} remaining to allocate`
            : `${formatCurrency(Math.abs(exactValidation.difference), currency)} over the total`}
        </p>
      )}
      {splitType === 'percentage' && pctValidation && !pctValidation.valid && (
        <p className="mt-2 text-sm text-red-500">
          Percentages total {pctValidation.total.toFixed(1)}% (must be 100%)
        </p>
      )}
    </div>
  );
}
