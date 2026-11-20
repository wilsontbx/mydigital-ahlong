'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';
import type { Expense } from '@/lib/types';

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  cash: { label: 'Cash', color: '#10b981' },
  card: { label: 'Card', color: '#3b82f6' },
  ewallet: { label: 'E-Wallet', color: '#f59e0b' },
  transfer: { label: 'Transfer', color: '#8b5cf6' },
  other: { label: 'Other', color: '#6b7280' },
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

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  const data = Object.entries(totals)
    .map(([method, value]) => ({
      name: PAYMENT_LABELS[method]?.label || method,
      value: Math.round(value * 100) / 100,
      color: PAYMENT_LABELS[method]?.color || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 p-4 sm:p-5 min-w-0 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">By Payment</h3>
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
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
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
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700 dark:text-gray-300 truncate flex-1 text-xs">{item.name}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium tabular-nums shrink-0">
              {grandTotal > 0 ? Math.round((item.value / grandTotal) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
