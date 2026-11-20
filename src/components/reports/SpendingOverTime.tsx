'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils/currency';
import type { Expense } from '@/lib/types';

interface Props {
  expenses: Expense[];
  currency: string;
}

export default function SpendingOverTime({ expenses, currency }: Props) {
  const monthlyTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const date = e.date?.toDate ? e.date.toDate() : new Date(e.date as unknown as string);
    const key = format(date, 'yyyy-MM');
    monthlyTotals[key] = (monthlyTotals[key] || 0) + (e.baseCurrencyAmount || e.amount);
  });

  const data = Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month: format(new Date(month + '-01'), 'MMM yyyy'),
      total: Math.round(total * 100) / 100,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Over Time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" fontSize={11} />
          <YAxis tickFormatter={(v) => formatCurrency(v, currency)} fontSize={11} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--foreground)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Area type="monotone" dataKey="total" stroke="#10b981" fill="url(#colorTotal)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
