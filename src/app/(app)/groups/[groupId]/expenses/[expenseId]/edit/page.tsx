'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGroup } from '@/lib/hooks/useGroup';
import { useExpense } from '@/lib/hooks/useExpenses';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import Spinner from '@/components/ui/Spinner';

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = use(params);
  const { group, loading: groupLoading } = useGroup(groupId);
  const { expense, loading: expenseLoading } = useExpense(groupId, expenseId);

  if (groupLoading || expenseLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!group) {
    return <div className="text-center py-20"><p>Group not found</p></div>;
  }

  if (!expense) {
    return <div className="text-center py-20"><p>Expense not found</p></div>;
  }

  return (
    <div>
      <Link href={`/groups/${groupId}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 inline-block">
        &larr; Back to {group.name}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Edit Expense</h1>
      {/* key ensures the form re-initialises if a different expense is loaded */}
      <ExpenseForm key={expense.id} group={group} groupId={groupId} expense={expense} />
    </div>
  );
}
