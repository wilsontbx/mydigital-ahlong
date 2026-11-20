'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { useGroup } from '@/lib/hooks/useGroup';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useAuth } from '@/lib/contexts/AuthContext';
import { updateGroup, deleteGroup } from '@/lib/services/groupService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import CurrencyPicker from '@/components/ui/CurrencyPicker';
import MemberList from '@/components/groups/MemberList';
import InviteCodeDisplay from '@/components/groups/InviteCodeDisplay';
import { getCurrencyInfo } from '@/lib/utils/currencies';
import toast from 'react-hot-toast';

export default function GroupSettingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { group, loading } = useGroup(groupId);
  const { expenses, loading: expensesLoading } = useExpenses(groupId);
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [rates, setRates] = useState<Record<string, number>>({});
  const [newCurrency, setNewCurrency] = useState('');
  const [newRate, setNewRate] = useState('');
  const [savingRates, setSavingRates] = useState(false);

  if (loading || expensesLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!group) {
    return <div className="text-center py-20"><p>Group not found</p></div>;
  }

  if (!initialized) {
    setName(group.name);
    setDescription(group.description);
    setStartDate(group.startDate || '');
    setEndDate(group.endDate || '');
    setRates(group.exchangeRates || {});
    setInitialized(true);
  }

  const isOwner = user?.uid === group.createdBy;

  // Get dates that have expenses
  const expenseDateSet = new Set<string>();
  expenses.forEach((e) => {
    const date = e.date?.toDate ? e.date.toDate() : new Date(e.date as unknown as string);
    expenseDateSet.add(format(date, 'yyyy-MM-dd'));
  });

  // Check if new date range would exclude existing expenses
  const getExcludedExpenseDates = (newStart: string, newEnd: string): string[] => {
    if (!newStart || !newEnd) return [];
    return Array.from(expenseDateSet).filter((d) => d < newStart || d > newEnd);
  };

  const excludedDates = getExcludedExpenseDates(startDate, endDate);

  const handleSave = async () => {
    if (excludedDates.length > 0) {
      toast.error(
        `Cannot save: ${excludedDates.length} expense date(s) would be outside the range. Remove those expenses first.`
      );
      return;
    }

    setSaving(true);
    try {
      await updateGroup(groupId, {
        name,
        description,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      } as Record<string, unknown>);
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
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Group Settings</h1>

      <div className="space-y-6">
        {/* Basic info */}
        <div className="space-y-4">
          <Input label="Group Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End"
                min={startDate}
              />
            </div>

            {/* Show warning if dates would exclude expenses */}
            {excludedDates.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Cannot change range — {excludedDates.length} expense(s) exist on excluded dates:
                </p>
                <ul className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {excludedDates.slice(0, 5).map((d) => (
                    <li key={d}>• {format(parseISO(d), 'EEE, d MMM yyyy')}</li>
                  ))}
                  {excludedDates.length > 5 && (
                    <li>• ...and {excludedDates.length - 5} more</li>
                  )}
                </ul>
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  Remove or move those expenses before changing the date range.
                </p>
              </div>
            )}

            {/* Show which dates have expenses */}
            {startDate && endDate && expenseDateSet.size > 0 && excludedDates.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const hasExpenses = expenseDateSet.has(dayStr);
                  return (
                    <span
                      key={dayStr}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        hasExpenses
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  );
                })}
                <span className="text-[10px] text-gray-400 ml-1 self-center">
                  (green = has expenses)
                </span>
              </div>
            )}
          </div>

          <Button onClick={handleSave} loading={saving} disabled={excludedDates.length > 0}>
            Save Changes
          </Button>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Exchange Rates */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Currency Rates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Set exchange rates so expenses auto-convert to {group.currency}.
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
