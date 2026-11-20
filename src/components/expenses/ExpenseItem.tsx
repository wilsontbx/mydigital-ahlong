'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/currency';
import { getCurrencySymbol } from '@/lib/utils/currencies';
import { deleteExpense } from '@/lib/services/expenseService';
import toast from 'react-hot-toast';
import type { Expense, GroupMember } from '@/lib/types';

interface ExpenseItemProps {
  expense: Expense;
  members: Record<string, GroupMember>;
  currency: string;
  groupId: string;
  currentUserId?: string;
}

const paymentIcons: Record<string, string> = {
  cash: '💵', card: '💳', ewallet: '📱', transfer: '🏦', other: '📝',
};

export default function ExpenseItem({ expense, members, currency, groupId, currentUserId }: ExpenseItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const paidByName = members[expense.paidBy]?.displayName || 'Unknown';
  const isYouPaid = expense.paidBy === currentUserId;
  const isDifferentCurrency = expense.currency && expense.currency !== currency;
  const myShare = currentUserId ? (expense.splits[currentUserId] || 0) : 0;
  const totalAmount = expense.baseCurrencyAmount || expense.amount;
  const participantCount = expense.participants?.length || Object.keys(expense.splits).length;

  const handleDelete = async () => {
    if (!expense.id) return;
    setDeleting(true);
    try {
      await deleteExpense(groupId, expense.id, {
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        exchangeRate: expense.exchangeRate || 1,
        baseCurrencyAmount: expense.baseCurrencyAmount || expense.amount,
        category: expense.category,
        paidBy: expense.paidBy,
        splitType: expense.splitType,
        splits: expense.splits,
        participants: expense.participants,
        createdBy: expense.createdBy,
      });
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Main row — tap to expand */}
      <div
        className="py-3 flex items-start justify-between gap-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/50 -mx-2 px-2 rounded-lg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {expense.description}
          </h4>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {expense.expenseType && expense.expenseType !== 'expense' && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                expense.expenseType === 'prepaid'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
              }`}>
                {expense.expenseType === 'prepaid' ? '📋 Pre-paid' : '💰 Advance'}
              </span>
            )}
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {expense.category}
            </span>
            {expense.paymentMethod && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {paymentIcons[expense.paymentMethod]}
              </span>
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {isYouPaid ? 'You paid' : `${paidByName} paid`} · {participantCount} pax
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          {isDifferentCurrency ? (
            <>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
              </span>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {formatCurrency(totalAmount, currency)}
              </p>
            </>
          ) : (
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(expense.amount, currency)}
            </span>
          )}
          {currentUserId && myShare > 0 && (
            <p className={`text-[11px] mt-0.5 ${
              isYouPaid
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {isYouPaid
                ? `You lent ${formatCurrency(totalAmount - myShare, currency)}`
                : `You owe ${formatCurrency(myShare, currency)}`
              }
            </p>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="pb-3 -mt-1 ml-1">
          {/* Split breakdown */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400 mb-2">
            {Object.entries(expense.splits).map(([uid, share]) => (
              <span key={uid}>
                {members[uid]?.displayName || uid}: {formatCurrency(share, currency)}
              </span>
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this expense? Balances will be updated.')) {
                handleDelete();
              }
            }}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete expense'}
          </button>
        </div>
      )}
    </div>
  );
}
