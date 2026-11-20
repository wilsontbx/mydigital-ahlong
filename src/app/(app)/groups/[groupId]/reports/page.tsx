'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useGroup } from '@/lib/hooks/useGroup';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { formatCurrency } from '@/lib/utils/currency';
import { parseExpenseDate } from '@/lib/utils/dateFormat';
import Spinner from '@/components/ui/Spinner';
import StatCard from '@/components/reports/StatCard';
import SpendingByCategory from '@/components/reports/SpendingByCategory';
import SpendingByPerson from '@/components/reports/SpendingByPerson';
import SpendingByPayment from '@/components/reports/SpendingByPayment';
import SpendingByDate from '@/components/reports/SpendingByDate';

export default function ReportsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { group, loading: groupLoading } = useGroup(groupId);
  const { expenses, loading: expensesLoading } = useExpenses(groupId);

  const stats = useMemo(() => {
    if (!group || expenses.length === 0) return null;

    const totalSpent = expenses.reduce((sum, e) => sum + (e.baseCurrencyAmount || e.amount), 0);
    const prepaidTotal = expenses.filter((e) => e.expenseType === 'prepaid').reduce((sum, e) => sum + (e.baseCurrencyAmount || e.amount), 0);
    const tripTotal = totalSpent - prepaidTotal;
    const memberCount = group.memberIds.length;
    const avgPerPerson = memberCount > 0 ? totalSpent / memberCount : 0;
    const avgPerExpense = totalSpent / expenses.length;

    const days = group.startDate && group.endDate
      ? Math.max(1, Math.ceil((new Date(group.endDate).getTime() - new Date(group.startDate).getTime()) / 86400000) + 1)
      : null;
    const avgPerDay = days ? totalSpent / days : null;

    const topExpense = expenses.reduce((max, e) => {
      const amt = e.baseCurrencyAmount || e.amount;
      return amt > (max.amount || 0) ? { description: e.description, amount: amt } : max;
    }, { description: '', amount: 0 });

    const dailyTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      const date = parseExpenseDate(e.date);
      if (!date) return;
      const key = format(date, 'yyyy-MM-dd');
      dailyTotals[key] = (dailyTotals[key] || 0) + (e.baseCurrencyAmount || e.amount);
    });
    const topDay = Object.entries(dailyTotals).reduce(
      (max, [day, total]) => (total > max.total ? { day, total } : max),
      { day: '', total: 0 }
    );

    return { totalSpent, prepaidTotal, tripTotal, avgPerPerson, avgPerExpense, avgPerDay, memberCount, count: expenses.length, topExpense, topDay };
  }, [expenses, group]);

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
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Reports</h1>
      {group.startDate && group.endDate && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {format(parseISO(group.startDate), 'd MMM yyyy')} → {format(parseISO(group.endDate), 'd MMM yyyy')}
        </p>
      )}

      {expenses.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No expenses yet to generate reports.</p>
      ) : (
        <div className="space-y-4">
          {stats && (
            <>
              {/* Row 1: Key numbers */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Total Spent"
                  value={formatCurrency(stats.totalSpent, group.currency)}
                  subtext={`${stats.count} expenses`}
                />
                <StatCard
                  label="Avg / Person"
                  value={formatCurrency(stats.avgPerPerson, group.currency)}
                  subtext={`${stats.memberCount} members`}
                />
              </div>

              {/* Row 2: More stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Avg / Expense"
                  value={formatCurrency(stats.avgPerExpense, group.currency)}
                />
                {stats.avgPerDay && (
                  <StatCard
                    label="Avg / Day"
                    value={formatCurrency(stats.avgPerDay, group.currency)}
                  />
                )}
                {stats.topDay.day && (
                  <StatCard
                    label="Top Day"
                    value={formatCurrency(stats.topDay.total, group.currency)}
                    subtext={format(parseISO(stats.topDay.day), 'EEE, d MMM')}
                  />
                )}
              </div>

              {/* Biggest expense */}
              {stats.topExpense.description && (
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

              {/* Pre-paid breakdown */}
              {stats.prepaidTotal > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Pre-paid"
                    value={formatCurrency(stats.prepaidTotal, group.currency)}
                    subtext="Booked before trip"
                  />
                  {stats.tripTotal > 0 && (
                    <StatCard
                      label="During Trip"
                      value={formatCurrency(stats.tripTotal, group.currency)}
                      subtext="On-trip expenses"
                    />
                  )}
                </div>
              )}
            </>
          )}

          {/* Charts */}
          <SpendingByDate
            expenses={expenses}
            currency={group.currency}
            startDate={group.startDate}
            endDate={group.endDate}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <SpendingByCategory expenses={expenses} currency={group.currency} />
            <SpendingByPayment expenses={expenses} currency={group.currency} />
          </div>

          <SpendingByPerson expenses={expenses} members={group.members} currency={group.currency} />
        </div>
      )}
    </div>
  );
}
