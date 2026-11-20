'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useGroups } from '@/lib/hooks/useGroups';
import GroupList from '@/components/groups/GroupList';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const { groups, loading } = useGroups();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Hey, {user?.displayName || 'there'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your split bills and settle up
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/groups/join">
            <Button variant="secondary">Join Group</Button>
          </Link>
          <Link href="/groups/new">
            <Button>New Group</Button>
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          title="No groups yet"
          description="Create a group to start splitting bills with friends, roommates, or travel buddies."
          action={
            <Link href="/groups/new">
              <Button>Create Your First Group</Button>
            </Link>
          }
        />
      ) : (
        <GroupList groups={groups} />
      )}
    </div>
  );
}
