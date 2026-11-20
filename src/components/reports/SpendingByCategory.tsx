'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';
import type { Expense } from '@/lib/types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

interface Props {
  expenses: Expense[];
  currency: string;
}

export default function SpendingByCategory({ expenses, currency }: Props) {
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.baseCurrencyAmount || e.amount);
  });

  const total = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  const data = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 p-4 sm:p-5 min-w-0 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">By Category</h3>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={72}
            dataKey="value"
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              padding: '8px 12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Custom legend with amounts */}
      <div className="mt-3 space-y-1.5">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-gray-700 dark:text-gray-300 truncate flex-1 text-xs">{item.name}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium tabular-nums shrink-0">
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
