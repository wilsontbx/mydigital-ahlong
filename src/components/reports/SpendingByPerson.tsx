'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';
import type { Expense, GroupMember } from '@/lib/types';

interface Props {
  expenses: Expense[];
  members: Record<string, GroupMember>;
  currency: string;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function SpendingByPerson({ expenses, members, currency }: Props) {
  const personTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    personTotals[e.paidBy] = (personTotals[e.paidBy] || 0) + (e.baseCurrencyAmount || e.amount);
  });

  const data = Object.entries(personTotals)
    .map(([uid, total], i) => ({
      name: members[uid]?.displayName || uid,
      total: Math.round(total * 100) / 100,
      fill: COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 p-4 sm:p-5 min-w-0 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Who Paid What</h3>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.07} />
          <XAxis
            type="number"
            tickFormatter={(v) => formatCurrency(v, currency)}
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={70}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#9ca3af' }}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value), currency), 'Paid']}
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
          <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
