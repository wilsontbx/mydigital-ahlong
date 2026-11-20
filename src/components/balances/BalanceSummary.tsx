'use client';

import { useMemo } from 'react';
import { simplifyDebts } from '@/lib/utils/debtSimplifier';
import { formatCurrency } from '@/lib/utils/currency';
import type { GroupMember } from '@/lib/types';

interface BalanceSummaryProps {
  balances: Record<string, Record<string, number>>;
  members: Record<string, GroupMember>;
  currency: string;
  currentUserId?: string;
}

export default function BalanceSummary({ balances, members, currency, currentUserId }: BalanceSummaryProps) {
  const debts = useMemo(() => simplifyDebts(balances), [balances]);

  if (debts.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">All settled up!</p>
    );
  }

  return (
    <div className="space-y-2">
      {debts.map((debt, i) => {
        const fromName = debt.from === currentUserId ? 'You' : (members[debt.from]?.displayName || 'Unknown');
        const toName = debt.to === currentUserId ? 'you' : (members[debt.to]?.displayName || 'Unknown');

        return (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">{fromName}</span>
              {' owes '}
              <span className="font-medium">{toName}</span>
            </span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(debt.amount, currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
