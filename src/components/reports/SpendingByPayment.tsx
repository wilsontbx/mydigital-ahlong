'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';
import type { Expense } from '@/lib/types';

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  cash: { label: '💵 Cash', color: '#10b981' },
  card: { label: '💳 Card', color: '#3b82f6' },
  ewallet: { label: '📱 E-Wallet', color: '#f59e0b' },
  transfer: { label: '🏦 Transfer', color: '#8b5cf6' },
  other: { label: '📝 Other', color: '#6b7280' },
};

interface Props {
  expenses: Expense[];
  currency: string;
}

export default function SpendingByPayment({ expenses, currency }: Props) {
  const totals: Record<string, number> = {};
  expenses.forEach((e) => {
    const method = e.paymentMethod || 'other';
    totals[method] = (totals[method] || 0) + (e.baseCurrencyAmount || e.amount);
  });

  const data = Object.entries(totals)
    .map(([method, value]) => ({
      name: PAYMENT_LABELS[method]?.label || method,
      value: Math.round(value * 100) / 100,
      color: PAYMENT_LABELS[method]?.color || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">By Payment Method</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--foreground)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-gray-700 dark:text-gray-300">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
