'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';
import type { Expense, GroupMember } from '@/lib/types';

interface Props {
  expenses: Expense[];
  members: Record<string, GroupMember>;
  currency: string;
}

export default function ShareByPerson({ expenses, members, currency }: Props) {
  const paidTotals: Record<string, number> = {};
  const shareTotals: Record<string, number> = {};

  expenses.forEach((e) => {
    const amount = e.baseCurrencyAmount || e.amount;
    paidTotals[e.paidBy] = (paidTotals[e.paidBy] || 0) + amount;
    for (const [uid, share] of Object.entries(e.splits)) {
      shareTotals[uid] = (shareTotals[uid] || 0) + share;
    }
  });

  const allUids = new Set([...Object.keys(paidTotals), ...Object.keys(shareTotals)]);
  const data = Array.from(allUids)
    .map((uid) => ({
      name: members[uid]?.displayName || uid,
      paid: Math.round((paidTotals[uid] || 0) * 100) / 100,
      share: Math.round((shareTotals[uid] || 0) * 100) / 100,
    }))
    .sort((a, b) => b.share - a.share);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Paid vs Share</h3>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 50)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" tickFormatter={(v) => formatCurrency(v, currency)} fontSize={10} />
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
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-gray-700 dark:text-gray-300">{value === 'paid' ? 'Paid' : 'Their Share'}</span>
            )}
          />
          <Bar dataKey="paid" fill="#10b981" radius={[0, 4, 4, 0]} />
          <Bar dataKey="share" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
