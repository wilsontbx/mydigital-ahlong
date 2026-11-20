'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils/currency';
import { getExpenseDates } from '@/lib/utils/dateFormat';
import type { Expense, GroupMember } from '@/lib/types';
import ExpenseItem from './ExpenseItem';

interface ExpenseListProps {
  expenses: Expense[];
  members: Record<string, GroupMember>;
  currency: string;
  groupId: string;
  currentUserId?: string;
}

export default function ExpenseList({ expenses, members, currency, groupId, currentUserId }: ExpenseListProps) {
  const { prepaidExpenses, grouped, summary } = useMemo(() => {
    const dateGroups: { dateKey: string; label: string; expenses: Expense[]; total: number }[] = [];
    const map = new Map<string, Expense[]>();
    const prepaid: Expense[] = [];

    let totalSpent = 0;
    let prepaidTotal = 0;
    let myTotal = 0;
    let youPaid = 0;

    expenses.forEach((e) => {
      const amt = e.baseCurrencyAmount || e.amount;
      const type = e.expenseType || 'expense';

      if (type === 'prepaid') {
        prepaid.push(e);
        prepaidTotal += amt;
      } else {
        const expDates = getExpenseDates(e);
        const key = expDates.length > 0 ? expDates[0] : 'unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      }

      totalSpent += amt;
      if (currentUserId) {
        myTotal += e.splits[currentUserId] || 0;
        if (e.paidBy === currentUserId) youPaid += amt;
      }
    });

    for (const [key, exps] of map.entries()) {
      const total = exps.reduce((sum, e) => sum + (e.baseCurrencyAmount || e.amount), 0);
      const label = key === 'unknown'
        ? 'Unknown date'
        : format(new Date(key), 'EEE, d MMM yyyy');
      dateGroups.push({ dateKey: key, label, expenses: exps, total });
    }

    return {
      prepaidExpenses: prepaid,
      grouped: dateGroups.sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
      summary: { totalSpent, prepaidTotal, myTotal, youPaid, count: expenses.length },
    };
  }, [expenses, currentUserId]);

  return (
    <div>
      {/* Summary bar */}
      <div className="flex gap-2 mb-4 text-xs overflow-x-auto pb-1">
        <div className="bg-gray-100 dark:bg-gray-700 px-2.5 py-1.5 rounded-lg shrink-0">
          <span className="text-gray-500 dark:text-gray-400">Total </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(summary.totalSpent, currency)}
          </span>
        </div>
        {currentUserId && (
          <>
            <div className="bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1.5 rounded-lg shrink-0">
              <span className="text-orange-600 dark:text-orange-400">Your share </span>
              <span className="font-semibold text-orange-700 dark:text-orange-300">
                {formatCurrency(summary.myTotal, currency)}
              </span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg shrink-0">
              <span className="text-emerald-600 dark:text-emerald-400">You paid </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(summary.youPaid, currency)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Pre-paid section */}
      {prepaidExpenses.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              📋 Pre-paid ({prepaidExpenses.length})
            </h3>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.prepaidTotal, currency)}
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 border-l-2 border-blue-300 dark:border-blue-700 pl-3">
            {prepaidExpenses.map((expense) => (
              <ExpenseItem key={expense.id} expense={expense} members={members} currency={currency} groupId={groupId} currentUserId={currentUserId} />
            ))}
          </div>
        </div>
      )}

      {/* Regular expenses grouped by date */}
      {grouped.length > 0 && (
        <div className="space-y-4">
          {prepaidExpenses.length > 0 && (
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              🧾 Trip Expenses
            </h3>
          )}
          {grouped.map((group) => (
            <div key={group.dateKey}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group.label}
                </h3>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {formatCurrency(group.total, currency)}
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {group.expenses.map((expense) => (
                  <ExpenseItem key={expense.id} expense={expense} members={members} currency={currency} groupId={groupId} currentUserId={currentUserId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
