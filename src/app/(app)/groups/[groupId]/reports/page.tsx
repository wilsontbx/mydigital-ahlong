'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useGroup } from '@/lib/hooks/useGroup';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { formatCurrency } from '@/lib/utils/currency';
import { getExpenseDates } from '@/lib/utils/dateFormat';
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
    let undatedTotal = 0;
    expenses.forEach((e) => {
      const expDates = getExpenseDates(e);
      const amt = e.baseCurrencyAmount || e.amount;
      if (expDates.length === 0) {
        undatedTotal += amt;
        return;
      }
      const perDay = amt / expDates.length;
      expDates.forEach((key) => {
        dailyTotals[key] = (dailyTotals[key] || 0) + perDay;
      });
    });
    if (undatedTotal > 0 && days) {
      const spreadPerDay = undatedTotal / days;
      for (const key of Object.keys(dailyTotals)) {
        dailyTotals[key] += spreadPerDay;
      }
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/groups/${groupId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to {group.name}
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
        {group.startDate && group.endDate && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {format(parseISO(group.startDate), 'd MMM yyyy')} → {format(parseISO(group.endDate), 'd MMM yyyy')}
          </p>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No expenses yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add some expenses to see your reports.</p>
        </div>
      ) : (
        <>
          {stats && (
            <>
              {/* Hero: Total Spent */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 p-5 sm:p-6 text-white shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/30">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                <div className="relative">
                  <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Total Spent</p>
                  <p className="text-2xl sm:text-4xl font-extrabold mt-1 tracking-tight">
                    {formatCurrency(stats.totalSpent, group.currency)}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-emerald-100">
                    <span>{stats.count} expenses</span>
                    <span>{stats.memberCount} members</span>
                    {stats.avgPerDay && (
                      <span>{formatCurrency(stats.avgPerDay, group.currency)}/day</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Per Person"
                  value={formatCurrency(stats.avgPerPerson, group.currency)}
                  subtext={`${stats.memberCount} members`}
                  accent="blue"
                />
                <StatCard
                  label="Per Expense"
                  value={formatCurrency(stats.avgPerExpense, group.currency)}
                  subtext={`${stats.count} total`}
                  accent="purple"
                />
                {stats.topDay.day && (
                  <StatCard
                    label="Top Day"
                    value={formatCurrency(stats.topDay.total, group.currency)}
                    subtext={format(parseISO(stats.topDay.day), 'EEE, d MMM')}
                    accent="amber"
                  />
                )}
              </div>

              {/* Biggest expense */}
              {stats.topExpense.description && (
                <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 dark:from-rose-500/15 dark:to-rose-500/5 rounded-2xl border border-rose-200/60 dark:border-rose-500/20 p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Biggest Expense
                    </p>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                    {formatCurrency(stats.topExpense.amount, group.currency)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{stats.topExpense.description}</p>
                </div>
              )}

              {/* Pre-paid breakdown */}
              {stats.prepaidTotal > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Pre-paid"
                    value={formatCurrency(stats.prepaidTotal, group.currency)}
                    subtext="Booked before trip"
                    accent="emerald"
                  />
                  {stats.tripTotal > 0 && (
                    <StatCard
                      label="During Trip"
                      value={formatCurrency(stats.tripTotal, group.currency)}
                      subtext="On-trip expenses"
                      accent="blue"
                    />
                  )}
                </div>
              )}
            </>
          )}

          {/* Section: Trends */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Trends</h2>
            <SpendingByDate
              expenses={expenses}
              currency={group.currency}
              startDate={group.startDate}
              endDate={group.endDate}
            />
          </div>

          {/* Section: Breakdowns */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Breakdowns</h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SpendingByCategory expenses={expenses} currency={group.currency} />
                <SpendingByPayment expenses={expenses} currency={group.currency} />
              </div>
              <SpendingByPerson expenses={expenses} members={group.members} currency={group.currency} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
