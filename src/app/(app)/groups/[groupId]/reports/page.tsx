'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useGroup } from '@/lib/hooks/useGroup';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';
import Spinner from '@/components/ui/Spinner';
import StatCard from '@/components/reports/StatCard';
import SpendingByCategory from '@/components/reports/SpendingByCategory';
import SpendingByPerson from '@/components/reports/SpendingByPerson';
import SpendingOverTime from '@/components/reports/SpendingOverTime';

export default function ReportsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { group, loading: groupLoading } = useGroup(groupId);
  const { expenses, loading: expensesLoading } = useExpenses(groupId);
  const { user } = useAuth();

  const stats = useMemo(() => {
    if (!group || expenses.length === 0) return null;

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const myShare = expenses.reduce((sum, e) => {
      return sum + (e.splits[user?.uid || ''] || 0);
    }, 0);
    const avgPerExpense = totalSpent / expenses.length;

    return { totalSpent, myShare, avgPerExpense, count: expenses.length };
  }, [expenses, group, user?.uid]);

  if (groupLoading || expensesLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!group) {
    return <div className="text-center py-20"><p>Group not found</p></div>;
  }

  return (
    <div>
      <Link href={`/groups/${groupId}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 inline-block">
        ← Back to {group.name}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Reports</h1>

      {expenses.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No expenses yet to generate reports.</p>
      ) : (
        <div className="space-y-6">
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Spent"
                value={formatCurrency(stats.totalSpent, group.currency)}
              />
              <StatCard
                label="Your Share"
                value={formatCurrency(stats.myShare, group.currency)}
              />
              <StatCard
                label="Avg per Expense"
                value={formatCurrency(stats.avgPerExpense, group.currency)}
              />
              <StatCard
                label="Expenses"
                value={stats.count.toString()}
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <SpendingByCategory expenses={expenses} currency={group.currency} />
            <SpendingByPerson expenses={expenses} members={group.members} currency={group.currency} />
          </div>

          <SpendingOverTime expenses={expenses} currency={group.currency} />
        </div>
      )}
    </div>
  );
}
