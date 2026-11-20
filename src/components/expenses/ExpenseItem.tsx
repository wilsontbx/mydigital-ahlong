'use client';

import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/dateFormat';
import { getCurrencySymbol } from '@/lib/utils/currencies';
import type { Expense, GroupMember } from '@/lib/types';

interface ExpenseItemProps {
  expense: Expense;
  members: Record<string, GroupMember>;
  currency: string;
  currentUserId?: string;
}

export default function ExpenseItem({ expense, members, currency, currentUserId }: ExpenseItemProps) {
  const paidByName = members[expense.paidBy]?.displayName || 'Unknown';
  const isYou = expense.paidBy === currentUserId;
  const isDifferentCurrency = expense.currency && expense.currency !== currency;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {expense.description}
          </h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 shrink-0">
            {expense.category}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Paid by {isYou ? 'you' : paidByName} · {expense.date && formatDate(expense.date)}
        </p>
      </div>
      <div className="text-right ml-4 shrink-0">
        {isDifferentCurrency ? (
          <>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)} {expense.currency}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(expense.baseCurrencyAmount || expense.amount, currency)}
            </p>
          </>
        ) : (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(expense.amount, currency)}
          </span>
        )}
      </div>
    </div>
  );
}
