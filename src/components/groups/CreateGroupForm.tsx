'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createGroup } from '@/lib/services/groupService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CurrencyPicker from '@/components/ui/CurrencyPicker';
import toast from 'react-hot-toast';
import type { Group } from '@/lib/types';

const CATEGORIES: { value: Group['category']; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'household', label: 'Household' },
  { value: 'couple', label: 'Couple' },
  { value: 'other', label: 'Other' },
];

export default function CreateGroupForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Group['category']>('travel');
  const [currency, setCurrency] = useState('MYR');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Navigate optimistically — the real-time listener will show data when it arrives
    const groupPromise = createGroup(name, description, category, currency, {
      uid: user.uid,
      displayName: user.displayName || 'User',
      email: user.email || '',
    });

    groupPromise
      .then((groupId) => {
        toast.success('Group created!');
        router.push(`/groups/${groupId}`);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to create group');
        setLoading(false);
      });

    // Navigate to dashboard immediately so user isn't stuck
    router.push('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <Input
        label="Group Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Langkawi Trip 2024"
        required
      />
      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional description"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Category
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                category === cat.value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      <CurrencyPicker
        label="Base Currency"
        value={currency}
        onChange={setCurrency}
      />
      <Button type="submit" loading={loading} className="w-full">
        Create Group
      </Button>
    </form>
  );
}
