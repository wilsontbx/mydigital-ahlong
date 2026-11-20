'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGroup } from '@/lib/hooks/useGroup';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import Spinner from '@/components/ui/Spinner';

export default function NewExpensePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { group, loading } = useGroup(groupId);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!group) {
    return <div className="text-center py-20"><p>Group not found</p></div>;
  }

  return (
    <div>
      <Link href={`/groups/${groupId}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 inline-block">
        &larr; Back to {group.name}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Add Expense</h1>
      <ExpenseForm group={group} groupId={groupId} />
    </div>
  );
}
