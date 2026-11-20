'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import Card from '@/components/ui/Card';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Profile</h1>
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Name
            </label>
            <p className="text-gray-900 dark:text-gray-100 font-medium">
              {user?.displayName || 'Not set'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Email
            </label>
            <p className="text-gray-900 dark:text-gray-100">{user?.email}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              User ID
            </label>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-mono">{user?.uid}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
