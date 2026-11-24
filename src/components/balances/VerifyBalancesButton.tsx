'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { recalculateBalances, fixBalances } from '@/lib/services/expenseService';
import { diffBalances, amountsMatch, type BalanceMismatch } from '@/lib/utils/balanceCalculator';
import { formatCurrency } from '@/lib/utils/currency';
import type { Group } from '@/lib/types';

interface VerifyBalancesButtonProps {
  group: Group;
  groupId: string;
}

interface VerifyResult {
  expenseCount: number;
  mismatches: BalanceMismatch[];
  storedTotal: number;
  expectedTotal: number;
}

export default function VerifyBalancesButton({ group, groupId }: VerifyBalancesButtonProps) {
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const name = (uid: string) => group.members[uid]?.displayName || 'Unknown';

  const handleVerify = async () => {
    setChecking(true);
    try {
      const { balances, totalExpenses, expenseCount } = await recalculateBalances(groupId);
      setResult({
        expenseCount,
        mismatches: diffBalances(group.balances || {}, balances),
        storedTotal: group.totalExpenses || 0,
        expectedTotal: totalExpenses,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify balances');
    } finally {
      setChecking(false);
    }
  };

  const handleFix = async () => {
    setFixing(true);
    try {
      await fixBalances(groupId);
      toast.success('Balances recalculated and saved');
      setResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fix balances');
    } finally {
      setFixing(false);
    }
  };

  const totalOk = result ? amountsMatch(result.storedTotal, result.expectedTotal) : true;
  const allOk = result ? result.mismatches.length === 0 && totalOk : false;

  // Describe a pairwise balance (positive a→b means b owes a) in plain words.
  const describe = (from: string, to: string, amount: number) => {
    if (Math.abs(amount) < 0.01) return 'settled';
    return amount > 0
      ? `${name(to)} owes ${name(from)} ${formatCurrency(amount, group.currency)}`
      : `${name(from)} owes ${name(to)} ${formatCurrency(-amount, group.currency)}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={handleVerify}
        disabled={checking}
        className="text-xs px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
      >
        {checking ? 'Checking…' : 'Verify balances'}
      </button>

      <Modal isOpen={!!result} onClose={() => setResult(null)} title="Balance check">
        {result && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-500 dark:text-gray-400">
              Recalculated from {result.expenseCount} expense{result.expenseCount === 1 ? '' : 's'}.
            </p>

            {allOk ? (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-2 font-medium">
                ✓ Balances are correct. Nothing to fix.
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-3 py-2 font-medium">
                  Stored balances don&apos;t match the expenses.
                </div>

                {!totalOk && (
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Group total</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Stored {formatCurrency(result.storedTotal, group.currency)} → should be{' '}
                      {formatCurrency(result.expectedTotal, group.currency)}
                    </p>
                  </div>
                )}

                {result.mismatches.length > 0 && (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {result.mismatches.map((m) => (
                      <li key={`${m.from}-${m.to}`} className="border-b border-gray-100 dark:border-gray-700 pb-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {name(m.from)} ↔ {name(m.to)}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">Stored: {describe(m.from, m.to, m.stored)}</p>
                        <p className="text-gray-700 dark:text-gray-300">Should be: {describe(m.from, m.to, m.expected)}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <Button onClick={handleFix} loading={fixing} className="w-full">
                  Fix balances
                </Button>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
