'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGroup } from '@/lib/hooks/useGroup';
import SettleUpForm from '@/components/balances/SettleUpForm';
import Spinner from '@/components/ui/Spinner';

export default function SettlePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { group, loading } = useGroup(groupId);
  const router = useRouter();

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!group) {
    return <div className="text-center py-20"><p>Group not found</p></div>;
  }

  return (
    <div className="max-w-lg">
      <Link href={`/groups/${groupId}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 inline-block">
        &larr; Back to {group.name}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settle Up</h1>
      <SettleUpForm group={group} groupId={groupId} onDone={() => router.push(`/groups/${groupId}`)} />
    </div>
  );
}
