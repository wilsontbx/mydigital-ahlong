'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { addExpense } from '@/lib/services/expenseService';
import { calculateEqualSplit, validateExactSplit } from '@/lib/utils/splitCalculator';
import { formatCurrency } from '@/lib/utils/currency';
import { getCurrencySymbol } from '@/lib/utils/currencies';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CurrencyPicker from '@/components/ui/CurrencyPicker';
import CategoryPicker from './CategoryPicker';
import SplitSelector from './SplitSelector';
import toast from 'react-hot-toast';
import type { Group, SplitType } from '@/lib/types';

interface ExpenseFormProps {
  group: Group;
  groupId: string;
}

export default function ExpenseForm({ group, groupId }: ExpenseFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(group.currency);
  const [exchangeRate, setExchangeRate] = useState('1');
  const [category, setCategory] = useState('Food & Drinks');
  const [paidBy, setPaidBy] = useState(user?.uid || '');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [participants, setParticipants] = useState<string[]>(group.memberIds);
  const [splits, setSplits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const isDifferentCurrency = currency !== group.currency;
  const numAmount = parseFloat(amount) || 0;
  const numRate = parseFloat(exchangeRate) || 1;
  const baseCurrencyAmount = isDifferentCurrency
    ? Math.round(numAmount * numRate * 100) / 100
    : numAmount;

  const toggleParticipant = (uid: string) => {
    setParticipants((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (isDifferentCurrency && (!numRate || numRate <= 0)) {
      toast.error('Please enter a valid exchange rate');
      return;
    }

    if (participants.length < 1) {
      toast.error('Select at least one participant');
      return;
    }

    let finalSplits = splits;
    if (splitType === 'equal') {
      finalSplits = calculateEqualSplit(baseCurrencyAmount, participants);
    } else if (splitType === 'exact') {
      const validation = validateExactSplit(splits, baseCurrencyAmount);
      if (!validation.valid) {
        toast.error('Split amounts must equal the total');
        return;
      }
    } else if (splitType === 'percentage') {
      const sumSplits = Object.values(splits).reduce((a, b) => a + b, 0);
      if (Math.abs(sumSplits - baseCurrencyAmount) > 0.02) {
        toast.error('Percentage splits must total 100%');
        return;
      }
    }

    setLoading(true);
    try {
      await addExpense(groupId, {
        description,
        amount: numAmount,
        currency,
        exchangeRate: numRate,
        baseCurrencyAmount,
        category,
        paidBy,
        splitType,
        splits: finalSplits,
        participants,
        date: new Date(date),
        createdBy: user.uid,
      });
      toast.success('Expense added!');
      router.push(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What was this expense for?"
        required
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <CurrencyPicker
          label="Currency"
          value={currency}
          onChange={(code) => {
            setCurrency(code);
            if (code === group.currency) {
              setExchangeRate('1');
            } else {
              const savedRate = group.exchangeRates?.[code];
              setExchangeRate(savedRate ? String(savedRate) : '');
            }
          }}
        />
      </div>

      {isDifferentCurrency && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
            Exchange Rate (1 {currency} = ? {group.currency})
          </label>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="0.00"
          />
          {numAmount > 0 && numRate > 0 && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              {getCurrencySymbol(currency)}{numAmount.toFixed(2)} {currency} = {formatCurrency(baseCurrencyAmount, group.currency)}
            </p>
          )}
        </div>
      )}

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <CategoryPicker value={category} onChange={setCategory} />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Paid by
        </label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {group.memberIds.map((uid) => (
            <option key={uid} value={uid}>
              {group.members[uid]?.displayName || uid}
              {uid === user?.uid ? ' (you)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Split between
        </label>
        <div className="flex flex-wrap gap-2">
          {group.memberIds.map((uid) => (
            <button
              key={uid}
              type="button"
              onClick={() => toggleParticipant(uid)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                participants.includes(uid)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              }`}
            >
              {group.members[uid]?.displayName || uid}
            </button>
          ))}
        </div>
      </div>

      {participants.length > 0 && baseCurrencyAmount > 0 && (
        <SplitSelector
          splitType={splitType}
          onSplitTypeChange={setSplitType}
          amount={baseCurrencyAmount}
          currency={group.currency}
          participants={participants}
          members={group.members}
          splits={splits}
          onSplitsChange={setSplits}
        />
      )}

      <Button type="submit" loading={loading} className="w-full">
        Add Expense
      </Button>
    </form>
  );
}
