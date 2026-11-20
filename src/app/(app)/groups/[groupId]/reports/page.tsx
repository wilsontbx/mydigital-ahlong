'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useGroup } from '@/lib/hooks/useGroup';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';
import Spinner from '@/components/ui/Spinner';
import StatCard from '@/components/reports/StatCard';
import SpendingByCategory from '@/components/reports/SpendingByCategory';
import SpendingByPerson from '@/components/reports/SpendingByPerson';
import SpendingByPayment from '@/components/reports/SpendingByPayment';
import SpendingByDate from '@/components/reports/SpendingByDate';
import SpendingOverTime from '@/components/reports/SpendingOverTime';
import ShareByPerson from '@/components/reports/ShareByPerson';

export default function ReportsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { group, loading: groupLoading } = useGroup(groupId);
  const { expenses, loading: expensesLoading } = useExpenses(groupId);
  const { user } = useAuth();

  const stats = useMemo(() => {
    if (!group || expenses.length === 0) return null;

    const totalSpent = expenses.reduce((sum, e) => sum + (e.baseCurrencyAmount || e.amount), 0);
    const prepaidTotal = expenses.filter((e) => e.expenseType === 'prepaid').reduce((sum, e) => sum + (e.baseCurrencyAmount || e.amount), 0);
    const advanceTotal = expenses.filter((e) => e.expenseType === 'advance').reduce((sum, e) => sum + (e.baseCurrencyAmount || e.amount), 0);
    const tripTotal = totalSpent - prepaidTotal - advanceTotal;
    const myShare = expenses.reduce((sum, e) => {
      return sum + (e.splits[user?.uid || ''] || 0);
    }, 0);
    const avgPerExpense = totalSpent / expenses.length;

    const days = group.startDate && group.endDate
      ? Math.max(1, Math.ceil((new Date(group.endDate).getTime() - new Date(group.startDate).getTime()) / 86400000) + 1)
      : null;
    const avgPerDay = days ? totalSpent / days : null;

    // Top expense
    const topExpense = expenses.reduce((max, e) => {
      const amt = e.baseCurrencyAmount || e.amount;
      return amt > (max.amount || 0) ? { description: e.description, amount: amt } : max;
    }, { description: '', amount: 0 });

    // Top spending day
    const dailyTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      const date = e.date?.toDate ? e.date.toDate() : new Date(e.date as unknown as string);
      const key = format(date, 'yyyy-MM-dd');
      dailyTotals[key] = (dailyTotals[key] || 0) + (e.baseCurrencyAmount || e.amount);
    });
    const topDay = Object.entries(dailyTotals).reduce(
      (max, [day, total]) => (total > max.total ? { day, total } : max),
      { day: '', total: 0 }
    );

    return { totalSpent, prepaidTotal, advanceTotal, tripTotal, myShare, avgPerExpense, avgPerDay, count: expenses.length, topExpense, topDay };
  }, [expenses, group, user?.uid]);

  if (groupLoading || expensesLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!group) {
    return <div className="text-center py-20"><p>Group not found</p></div>;
  }

  const formatDateRange = (start: string, end: string) => {
    return `${format(parseISO(start), 'd MMM yyyy')} → ${format(parseISO(end), 'd MMM yyyy')}`;
  };

  return (
    <div>
      <Link href={`/groups/${groupId}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 inline-block">
        ← Back to {group.name}
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Reports</h1>
      {group.startDate && group.endDate && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {formatDateRange(group.startDate, group.endDate)}
        </p>
      )}

      {expenses.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No expenses yet to generate reports.</p>
      ) : (
        <div className="space-y-4">
          {/* Stats row 1 */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Total Spent"
                value={formatCurrency(stats.totalSpent, group.currency)}
                subtext={`${stats.count} expenses`}
              />
              <StatCard
                label="Your Share"
                value={formatCurrency(stats.myShare, group.currency)}
                subtext={stats.totalSpent > 0
                  ? `${Math.round((stats.myShare / stats.totalSpent) * 100)}% of total`
                  : undefined}
              />
              {stats.avgPerDay ? (
                <StatCard
                  label="Avg / Day"
                  value={formatCurrency(stats.avgPerDay, group.currency)}
                />
              ) : (
                <StatCard
                  label="Avg / Expense"
                  value={formatCurrency(stats.avgPerExpense, group.currency)}
                />
              )}
              {stats.topDay.day && (
                <StatCard
                  label="Top Spending Day"
                  value={formatCurrency(stats.topDay.total, group.currency)}
                  subtext={format(parseISO(stats.topDay.day), 'EEE, d MMM')}
                />
              )}
            </div>
          )}

          {/* Pre-paid / Advance breakdown */}
          {stats && (stats.prepaidTotal > 0 || stats.advanceTotal > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stats.prepaidTotal > 0 && (
                <StatCard
                  label="📋 Pre-paid"
                  value={formatCurrency(stats.prepaidTotal, group.currency)}
                  subtext="Booked before trip"
                />
              )}
              {stats.advanceTotal > 0 && (
                <StatCard
                  label="💰 Advance"
                  value={formatCurrency(stats.advanceTotal, group.currency)}
                  subtext="Collected upfront"
                />
              )}
              {stats.tripTotal > 0 && (
                <StatCard
                  label="🧾 During Trip"
                  value={formatCurrency(stats.tripTotal, group.currency)}
                  subtext="On-trip expenses"
                />
              )}
            </div>
          )}

          {/* Stats row 2 */}
          {stats && stats.topExpense.description && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Biggest Expense
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                {formatCurrency(stats.topExpense.amount, group.currency)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stats.topExpense.description}</p>
            </div>
          )}

          {/* Daily spending */}
          <SpendingByDate
            expenses={expenses}
            currency={group.currency}
            startDate={group.startDate}
            endDate={group.endDate}
          />

          {/* Paid vs Share comparison */}
          <ShareByPerson expenses={expenses} members={group.members} currency={group.currency} />

          <div className="grid gap-4 lg:grid-cols-2">
            <SpendingByCategory expenses={expenses} currency={group.currency} />
            <SpendingByPayment expenses={expenses} currency={group.currency} />
          </div>

          <SpendingByPerson expenses={expenses} members={group.members} currency={group.currency} />

          {!group.startDate && (
            <SpendingOverTime expenses={expenses} currency={group.currency} />
          )}
        </div>
      )}
    </div>
  );
}
