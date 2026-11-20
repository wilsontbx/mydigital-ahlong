'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils/currency';
import { getExpenseDates } from '@/lib/utils/dateFormat';
import type { Expense } from '@/lib/types';

interface Props {
  expenses: Expense[];
  currency: string;
  startDate?: string;
  endDate?: string;
}

export default function SpendingByDate({ expenses, currency, startDate, endDate }: Props) {
  const dailyTotals: Record<string, number> = {};

  expenses.forEach((e) => {
    const expDates = getExpenseDates(e);
    if (expDates.length === 0) return;
    const perDay = (e.baseCurrencyAmount || e.amount) / expDates.length;
    expDates.forEach((key) => {
      dailyTotals[key] = (dailyTotals[key] || 0) + perDay;
    });
  });

  let data: { date: string; label: string; total: number }[];

  if (startDate && endDate) {
    data = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    }).map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      return {
        date: key,
        label: format(day, 'd MMM'),
        total: Math.round((dailyTotals[key] || 0) * 100) / 100,
      };
    });
  } else {
    data = Object.entries(dailyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => ({
        date: key,
        label: format(parseISO(key), 'd MMM'),
        total: Math.round(total * 100) / 100,
      }));
  }

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">By Date</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="label" fontSize={10} angle={-45} textAnchor="end" height={50} />
          <YAxis tickFormatter={(v) => formatCurrency(v, currency)} fontSize={10} width={70} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--foreground)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
