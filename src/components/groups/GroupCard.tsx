'use client';

import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/currency';
import type { Group } from '@/lib/types';

const CATEGORY_ICONS: Record<string, string> = {
  travel: '✈️',
  household: '🏠',
  couple: '💑',
  other: '📋',
};

export default function GroupCard({ group }: { group: Group }) {
  const router = useRouter();
  const memberCount = group.memberIds.length;

  return (
    <Card
      className="p-4 hover:border-emerald-300 dark:hover:border-emerald-700"
      onClick={() => router.push(`/groups/${group.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{CATEGORY_ICONS[group.category] || '📋'}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{group.description}</p>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Total: {formatCurrency(group.totalExpenses, group.currency)}
        </span>
        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          {group.currency}
        </span>
      </div>
    </Card>
  );
}
