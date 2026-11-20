'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGroup } from '@/lib/hooks/useGroup';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import InviteCodeDisplay from '@/components/groups/InviteCodeDisplay';
import MemberList from '@/components/groups/MemberList';
import ExpenseList from '@/components/expenses/ExpenseList';
import BalanceSummary from '@/components/balances/BalanceSummary';

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { group, loading: groupLoading } = useGroup(groupId);
  const { expenses, loading: expensesLoading } = useExpenses(groupId);
  const { user } = useAuth();

  if (groupLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Group not found</h2>
        <Link href="/dashboard" className="text-emerald-600 dark:text-emerald-400 hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block">
          ← Back
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{group.description}</p>
            )}
            {group.startDate && group.endDate && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {group.startDate} → {group.endDate}
              </p>
            )}
          </div>
          <Link href={`/groups/${groupId}/settings`} className="shrink-0">
            <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </Link>
        </div>

        {/* Quick stats bar */}
        <div className="flex gap-3 mt-3 text-sm">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg font-medium">
            Total: {formatCurrency(group.totalExpenses, group.currency)}
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-lg">
            {group.memberIds.length} members
          </div>
        </div>

        {/* Action buttons - horizontal scroll on mobile */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          <Link href={`/groups/${groupId}/expenses/new`}>
            <Button size="sm">+ Expense</Button>
          </Link>
<Link href={`/groups/${groupId}/reports`}>
            <Button variant="ghost" size="sm">Reports</Button>
          </Link>
        </div>
      </div>

      {/* Balances card - always visible at top on mobile */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Balances</h3>
        <BalanceSummary
          balances={group.balances || {}}
          members={group.members}
          currency={group.currency}
          currentUserId={user?.uid}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Expenses */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Expenses</h2>
            {expensesLoading ? (
              <Spinner />
            ) : expenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                description="Add your first expense to start tracking."
                action={
                  <Link href={`/groups/${groupId}/expenses/new`}>
                    <Button size="sm">Add Expense</Button>
                  </Link>
                }
              />
            ) : (
              <ExpenseList
                expenses={expenses}
                members={group.members}
                currency={group.currency}
                groupId={groupId}
                currentUserId={user?.uid}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Members ({group.memberIds.length})
            </h3>
            <MemberList members={group.members} currentUserId={user?.uid} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Invite Code</h3>
            <InviteCodeDisplay code={group.inviteCode} />
          </div>
        </div>
      </div>
    </div>
  );
}
