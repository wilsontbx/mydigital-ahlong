'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGroup } from '@/lib/hooks/useGroup';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useAuth } from '@/lib/contexts/AuthContext';
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-1 inline-block">
            ← Back to groups
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{group.name}</h1>
          {group.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{group.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/groups/${groupId}/settings`}>
            <Button variant="ghost" size="sm">Settings</Button>
          </Link>
          <Link href={`/groups/${groupId}/reports`}>
            <Button variant="ghost" size="sm">Reports</Button>
          </Link>
          <Link href={`/groups/${groupId}/settle`}>
            <Button variant="secondary" size="sm">Settle Up</Button>
          </Link>
          <Link href={`/groups/${groupId}/expenses/new`}>
            <Button size="sm">Add Expense</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Expenses</h2>
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
                currentUserId={user?.uid}
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Balances</h3>
            <BalanceSummary
              balances={group.balances || {}}
              members={group.members}
              currency={group.currency}
              currentUserId={user?.uid}
            />
          </div>

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
