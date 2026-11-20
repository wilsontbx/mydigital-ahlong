'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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

  let undatedTotal = 0;

  expenses.forEach((e) => {
    const expDates = getExpenseDates(e);
    const amt = e.baseCurrencyAmount || e.amount;
    if (expDates.length === 0) {
      undatedTotal += amt;
      return;
    }
    const perDay = amt / expDates.length;
    expDates.forEach((key) => {
      dailyTotals[key] = (dailyTotals[key] || 0) + perDay;
    });
  });

  let data: { date: string; label: string; total: number }[];

  if (startDate && endDate) {
    const allDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    const spreadPerDay = undatedTotal > 0 ? undatedTotal / allDays.length : 0;
    data = allDays.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      return {
        date: key,
        label: format(day, 'd MMM'),
        total: Math.round(((dailyTotals[key] || 0) + spreadPerDay) * 100) / 100,
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
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 p-4 sm:p-5 min-w-0 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Spending</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 0, right: 5, top: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.07} />
          <XAxis
            dataKey="label"
            fontSize={9}
            angle={-45}
            textAnchor="end"
            height={50}
            interval={data.length > 14 ? Math.floor(data.length / 7) : 0}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v, currency)}
            fontSize={9}
            width={55}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#9ca3af' }}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value), currency), 'Spent']}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              padding: '8px 12px',
            }}
            cursor={{ fill: 'currentColor', opacity: 0.05 }}
          />
          <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
