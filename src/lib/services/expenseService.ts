import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface ExpenseData {
  description: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  baseCurrencyAmount: number;
  category: string;
  expenseType?: string;
  paymentMethod?: string;
  paidBy: string;
  splitType: 'equal' | 'exact' | 'percentage';
  splits: Record<string, number>;
  participants: string[];
  date?: Date;
  createdBy: string;
}

export async function addExpense(groupId: string, data: ExpenseData): Promise<string> {
  const expenseRef = doc(collection(db, 'groups', groupId, 'expenses'));
  const groupRef = doc(db, 'groups', groupId);

  await runTransaction(db, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error('Group not found');

    const currentBalances = groupSnap.data().balances || {};

    const equalShare = data.splitType === 'equal'
      ? data.baseCurrencyAmount / data.participants.length
      : null;

    for (const [uid, shareAmount] of Object.entries(data.splits)) {
      if (uid === data.paidBy) continue;

      const balanceAmount = equalShare ?? shareAmount;
      const payer = data.paidBy;
      if (!currentBalances[payer]) currentBalances[payer] = {};
      if (!currentBalances[uid]) currentBalances[uid] = {};

      currentBalances[payer][uid] = (currentBalances[payer][uid] || 0) + balanceAmount;
      currentBalances[uid][payer] = (currentBalances[uid][payer] || 0) - balanceAmount;
    }

    const { date, ...rest } = data;
    transaction.set(expenseRef, {
      ...rest,
      ...(date ? { date: Timestamp.fromDate(date) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(groupRef, {
      balances: currentBalances,
      totalExpenses: increment(data.baseCurrencyAmount),
      updatedAt: serverTimestamp(),
    });
  });

  return expenseRef.id;
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  oldData: ExpenseData,
  newData: ExpenseData
): Promise<void> {
  const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
  const groupRef = doc(db, 'groups', groupId);

  await runTransaction(db, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error('Group not found');

    const currentBalances = groupSnap.data().balances || {};

    // Reverse old expense impact
    const oldEqualShare = oldData.splitType === 'equal'
      ? oldData.baseCurrencyAmount / oldData.participants.length
      : null;

    for (const [uid, shareAmount] of Object.entries(oldData.splits)) {
      if (uid === oldData.paidBy) continue;
      const balanceAmount = oldEqualShare ?? shareAmount;
      const payer = oldData.paidBy;
      if (currentBalances[payer]) currentBalances[payer][uid] = (currentBalances[payer][uid] || 0) - balanceAmount;
      if (currentBalances[uid]) currentBalances[uid][payer] = (currentBalances[uid][payer] || 0) + balanceAmount;
    }

    // Apply new expense impact
    const newEqualShare = newData.splitType === 'equal'
      ? newData.baseCurrencyAmount / newData.participants.length
      : null;

    for (const [uid, shareAmount] of Object.entries(newData.splits)) {
      if (uid === newData.paidBy) continue;
      const balanceAmount = newEqualShare ?? shareAmount;
      if (!currentBalances[newData.paidBy]) currentBalances[newData.paidBy] = {};
      if (!currentBalances[uid]) currentBalances[uid] = {};
      currentBalances[newData.paidBy][uid] = (currentBalances[newData.paidBy][uid] || 0) + balanceAmount;
      currentBalances[uid][newData.paidBy] = (currentBalances[uid][newData.paidBy] || 0) - balanceAmount;
    }

    const { date: newDate, ...newRest } = newData;
    transaction.update(expenseRef, {
      ...newRest,
      ...(newDate ? { date: Timestamp.fromDate(newDate) } : {}),
      updatedAt: serverTimestamp(),
    });

    transaction.update(groupRef, {
      balances: currentBalances,
      totalExpenses: increment(newData.baseCurrencyAmount - oldData.baseCurrencyAmount),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  expenseData: ExpenseData
): Promise<void> {
  const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
  const groupRef = doc(db, 'groups', groupId);

  await runTransaction(db, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error('Group not found');

    const currentBalances = groupSnap.data().balances || {};

    const delEqualShare = expenseData.splitType === 'equal'
      ? expenseData.baseCurrencyAmount / expenseData.participants.length
      : null;

    for (const [uid, shareAmount] of Object.entries(expenseData.splits)) {
      if (uid === expenseData.paidBy) continue;
      const balanceAmount = delEqualShare ?? shareAmount;
      const payer = expenseData.paidBy;
      if (currentBalances[payer]) currentBalances[payer][uid] = (currentBalances[payer][uid] || 0) - balanceAmount;
      if (currentBalances[uid]) currentBalances[uid][payer] = (currentBalances[uid][payer] || 0) + balanceAmount;
    }

    transaction.delete(expenseRef);
    transaction.update(groupRef, {
      balances: currentBalances,
      totalExpenses: increment(-expenseData.baseCurrencyAmount),
      updatedAt: serverTimestamp(),
    });
  });
}
