'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { addExpense } from '@/lib/services/expenseService';
import { calculateEqualSplit, validateExactSplit } from '@/lib/utils/splitCalculator';
import { formatCurrency } from '@/lib/utils/currency';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getCurrencyInfo } from '@/lib/utils/currencies';
import CategoryPicker from './CategoryPicker';
import SplitSelector from './SplitSelector';
import toast from 'react-hot-toast';
import type { Group, SplitType, PaymentMethod, ExpenseType } from '@/lib/types';

interface ExpenseFormProps {
  group: Group;
  groupId: string;
}

const EXPENSE_TYPES: { value: ExpenseType; label: string; icon: string; desc: string }[] = [
  { value: 'expense', label: 'Expense', icon: '🧾', desc: 'Regular trip expense' },
  { value: 'prepaid', label: 'Pre-paid', icon: '📋', desc: 'Booked before the trip (flight, hotel, etc.)' },
];

export default function ExpenseForm({ group, groupId }: ExpenseFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [expenseType, setExpenseType] = useState<ExpenseType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(group.currency);
  const [category, setCategory] = useState('Food & Drinks');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidBy, setPaidBy] = useState(user?.uid || '');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [participants, setParticipants] = useState<string[]>(group.memberIds);
  const [splits, setSplits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<string[]>(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (group.startDate && group.endDate) {
      if (today >= group.startDate && today <= group.endDate) return [today];
      return [group.startDate];
    }
    return [today];
  });

  const toggleDate = (dayStr: string) => {
    setDates((prev) => {
      if (prev.includes(dayStr)) {
        if (isRegularExpense && prev.length === 1) return prev;
        return prev.filter((d) => d !== dayStr);
      }
      return [...prev, dayStr].sort();
    });
  };

  const isDifferentCurrency = currency !== group.currency;
  const numAmount = parseFloat(amount) || 0;
  const numRate = isDifferentCurrency ? (group.exchangeRates?.[currency] || 1) : 1;
  const baseCurrencyAmount = isDifferentCurrency
    ? Math.round(numAmount * numRate * 100) / 100
    : numAmount;

  const isRegularExpense = expenseType === 'expense';

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
        expenseType,
        paymentMethod,
        paidBy,
        splitType,
        splits: finalSplits,
        participants,
        dates: dates.length > 0 ? dates : [],
        createdBy: user.uid,
      });
      toast.success(
        expenseType === 'prepaid' ? 'Pre-paid expense added!' : 'Expense added!'
      );
      router.push(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Expense Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {EXPENSE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setExpenseType(t.value);
                if (t.value === 'prepaid') {
                  setDates([]);
                } else if (dates.length === 0) {
                  const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  if (group.startDate && group.endDate) {
                    setDates([today >= group.startDate && today <= group.endDate ? today : group.startDate]);
                  } else {
                    setDates([today]);
                  }
                }
              }}
              className={`p-3 rounded-lg text-center border transition-colors ${
                expenseType === t.value
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="text-xl">{t.icon}</div>
              <div className={`text-sm font-medium mt-1 ${
                expenseType === t.value
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {t.label}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {EXPENSE_TYPES.find((t) => t.value === expenseType)?.desc}
        </p>
      </div>

      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={
          expenseType === 'prepaid' ? 'e.g. Flight tickets, Hotel booking' :
          'What was this expense for?'
        }
        required
      />

      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-3">
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
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={group.currency}>
              {getCurrencyInfo(group.currency)?.flag || ''} {group.currency}
            </option>
            {Object.keys(group.exchangeRates || {}).map((code) => (
              <option key={code} value={code}>
                {getCurrencyInfo(code)?.flag || ''} {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isDifferentCurrency && numRate > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Rate: 1 {currency} = {numRate} {group.currency}</span>
          {numAmount > 0 && (
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              → {formatCurrency(baseCurrencyAmount, group.currency)}
            </span>
          )}
        </div>
      )}

      {/* Date picker — multi-select */}
      {group.startDate && group.endDate ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date{dates.length > 1 && `s (${dates.length})`}
            {!isRegularExpense && dates.length === 0 && <span className="text-gray-400 font-normal"> (optional)</span>}
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {!isRegularExpense && (
              <button
                type="button"
                onClick={() => setDates([])}
                className={`shrink-0 w-16 py-2 rounded-lg text-center text-sm font-medium border transition-colors ${
                  dates.length === 0
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="text-[10px] uppercase opacity-60">&nbsp;</div>
                <div className="text-sm font-semibold">—</div>
                <div className="text-[10px] opacity-60">None</div>
              </button>
            )}
            {eachDayOfInterval({
              start: parseISO(group.startDate),
              end: parseISO(group.endDate),
            }).map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = dates.includes(dayStr);
              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => toggleDate(dayStr)}
                  className={`shrink-0 w-16 py-2 rounded-lg text-center text-sm font-medium border transition-colors ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-60">{format(day, 'EEE')}</div>
                  <div className="text-sm font-semibold">{format(day, 'd')}</div>
                  <div className="text-[10px] opacity-60">{format(day, 'MMM')}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <Input
          label={isRegularExpense ? 'Date' : 'Date (optional)'}
          type="date"
          value={dates[0] || ''}
          onChange={(e) => setDates(e.target.value ? [e.target.value] : [])}
          required={isRegularExpense}
        />
      )}

      <CategoryPicker value={category} onChange={setCategory} />

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Payment Method
        </label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'cash', label: '💵 Cash' },
            { value: 'card', label: '💳 Card' },
            { value: 'ewallet', label: '📱 E-Wallet' },
            { value: 'transfer', label: '🏦 Transfer' },
            { value: 'other', label: '📝 Other' },
          ] as const).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setPaymentMethod(m.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                paymentMethod === m.value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

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
        {expenseType === 'prepaid' ? 'Add Pre-paid' : 'Add Expense'}
      </Button>
    </form>
  );
}
