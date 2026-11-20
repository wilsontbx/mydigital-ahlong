'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { settleUp } from '@/lib/services/settlementService';
import { simplifyDebts } from '@/lib/utils/debtSimplifier';
import { formatCurrency } from '@/lib/utils/currency';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Group } from '@/lib/types';

interface SettleUpFormProps {
  group: Group;
  groupId: string;
  onDone: () => void;
}

export default function SettleUpForm({ group, groupId, onDone }: SettleUpFormProps) {
  const { user } = useAuth();
  const debts = useMemo(() => simplifyDebts(group.balances || {}), [group.balances]);
  const [selectedDebt, setSelectedDebt] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (debts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">All settled up! No outstanding debts.</p>
      </div>
    );
  }

  const debt = debts[selectedDebt];
  const defaultAmount = debt?.amount || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !debt) return;

    const settleAmount = parseFloat(amount) || defaultAmount;
    setLoading(true);

    try {
      await settleUp(groupId, debt.from, debt.to, settleAmount, user.uid);
      toast.success('Settlement recorded!');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to settle up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select debt to settle
        </label>
        <div className="space-y-2">
          {debts.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setSelectedDebt(i); setAmount(d.amount.toFixed(2)); }}
              className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${
                selectedDebt === i
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-gray-700 dark:text-gray-300">
                {group.members[d.from]?.displayName || d.from} &rarr; {group.members[d.to]?.displayName || d.to}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(d.amount, group.currency)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Amount to settle ({group.currency})
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount || defaultAmount.toFixed(2)}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Record Settlement
      </Button>
    </form>
  );
}
