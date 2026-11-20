'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGroup } from '@/lib/hooks/useGroup';
import { useAuth } from '@/lib/contexts/AuthContext';
import { updateGroup, deleteGroup } from '@/lib/services/groupService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import CurrencyPicker from '@/components/ui/CurrencyPicker';
import MemberList from '@/components/groups/MemberList';
import InviteCodeDisplay from '@/components/groups/InviteCodeDisplay';
import { POPULAR_CURRENCIES, getCurrencyInfo } from '@/lib/utils/currencies';
import toast from 'react-hot-toast';

export default function GroupSettingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { group, loading } = useGroup(groupId);
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Exchange rate state
  const [rates, setRates] = useState<Record<string, number>>({});
  const [newCurrency, setNewCurrency] = useState('');
  const [newRate, setNewRate] = useState('');
  const [savingRates, setSavingRates] = useState(false);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!group) {
    return <div className="text-center py-20"><p>Group not found</p></div>;
  }

  if (!initialized) {
    setName(group.name);
    setDescription(group.description);
    setRates(group.exchangeRates || {});
    setInitialized(true);
  }

  const isOwner = user?.uid === group.createdBy;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGroup(groupId, { name, description });
      toast.success('Group updated');
    } catch {
      toast.error('Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRate = () => {
    if (!newCurrency || newCurrency === group.currency) {
      toast.error('Pick a different currency than the base');
      return;
    }
    const rateNum = parseFloat(newRate);
    if (!rateNum || rateNum <= 0) {
      toast.error('Enter a valid rate');
      return;
    }
    setRates({ ...rates, [newCurrency]: rateNum });
    setNewCurrency('');
    setNewRate('');
  };

  const handleRemoveRate = (code: string) => {
    const updated = { ...rates };
    delete updated[code];
    setRates(updated);
  };

  const handleSaveRates = async () => {
    setSavingRates(true);
    try {
      await updateGroup(groupId, { exchangeRates: rates } as Record<string, unknown>);
      toast.success('Exchange rates saved');
    } catch {
      toast.error('Failed to save rates');
    } finally {
      setSavingRates(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteGroup(groupId);
      toast.success('Group deleted');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to delete group');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <Link href={`/groups/${groupId}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 inline-block">
        ← Back to group
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Group Settings</h1>

      <div className="space-y-6">
        <div className="space-y-4">
          <Input label="Group Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Exchange Rates */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Currency Rates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Set exchange rates so expenses in other currencies auto-convert to {group.currency}.
          </p>

          {Object.keys(rates).length > 0 && (
            <div className="space-y-2 mb-4">
              {Object.entries(rates).map(([code, rate]) => {
                const info = getCurrencyInfo(code);
                return (
                  <div key={code} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {info?.flag} 1 {code} = {rate} {group.currency}
                    </span>
                    <button
                      onClick={() => handleRemoveRate(code)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <CurrencyPicker
                label="Currency"
                value={newCurrency}
                onChange={setNewCurrency}
              />
            </div>
            <div className="w-32">
              <Input
                label={`= ? ${group.currency}`}
                type="number"
                step="0.0001"
                min="0.0001"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="Rate"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleAddRate} className="mb-0.5">
              Add
            </Button>
          </div>

          {Object.keys(rates).length > 0 && (
            <Button onClick={handleSaveRates} loading={savingRates} className="mt-3">
              Save Rates
            </Button>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Invite Code</h2>
          <InviteCodeDisplay code={group.inviteCode} />
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Members ({group.memberIds.length})
          </h2>
          <MemberList members={group.members} currentUserId={user?.uid} />
        </div>

        {isOwner && (
          <>
            <hr className="border-gray-200 dark:border-gray-700" />
            <div>
              <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Deleting a group is permanent and cannot be undone.
              </p>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                Delete Group
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
