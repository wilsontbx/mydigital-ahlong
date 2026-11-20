'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';
import type { Expense, GroupMember } from '@/lib/types';

interface Props {
  expenses: Expense[];
  members: Record<string, GroupMember>;
  currency: string;
}

export default function SpendingByPerson({ expenses, members, currency }: Props) {
  const personTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    personTotals[e.paidBy] = (personTotals[e.paidBy] || 0) + (e.baseCurrencyAmount || e.amount);
  });

  const data = Object.entries(personTotals)
    .map(([uid, total]) => ({
      name: members[uid]?.displayName || uid,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">By Person (Paid)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" tickFormatter={(v) => formatCurrency(v, currency)} fontSize={11} />
          <YAxis type="category" dataKey="name" width={80} fontSize={12} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--foreground)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
