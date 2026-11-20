import {
  collection,
  doc,
  setDoc,
  deleteDoc,
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
  paidBy: string;
  splitType: 'equal' | 'exact' | 'percentage';
  splits: Record<string, number>;
  participants: string[];
  date: Date;
  createdBy: string;
}

export async function addExpense(groupId: string, data: ExpenseData): Promise<string> {
  const expenseRef = doc(collection(db, 'groups', groupId, 'expenses'));
  const groupRef = doc(db, 'groups', groupId);

  await runTransaction(db, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error('Group not found');

    const currentBalances = groupSnap.data().balances || {};

    for (const [uid, shareAmount] of Object.entries(data.splits)) {
      if (uid === data.paidBy) continue;

      const payer = data.paidBy;
      if (!currentBalances[payer]) currentBalances[payer] = {};
      if (!currentBalances[uid]) currentBalances[uid] = {};

      currentBalances[payer][uid] = (currentBalances[payer][uid] || 0) + shareAmount;
      currentBalances[uid][payer] = (currentBalances[uid][payer] || 0) - shareAmount;
    }

    transaction.set(expenseRef, {
      ...data,
      date: Timestamp.fromDate(data.date),
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
    for (const [uid, shareAmount] of Object.entries(oldData.splits)) {
      if (uid === oldData.paidBy) continue;
      const payer = oldData.paidBy;
      if (currentBalances[payer]) currentBalances[payer][uid] = (currentBalances[payer][uid] || 0) - shareAmount;
      if (currentBalances[uid]) currentBalances[uid][payer] = (currentBalances[uid][payer] || 0) + shareAmount;
    }

    // Apply new expense impact
    for (const [uid, shareAmount] of Object.entries(newData.splits)) {
      if (uid === newData.paidBy) continue;
      if (!currentBalances[newData.paidBy]) currentBalances[newData.paidBy] = {};
      if (!currentBalances[uid]) currentBalances[uid] = {};
      currentBalances[newData.paidBy][uid] = (currentBalances[newData.paidBy][uid] || 0) + shareAmount;
      currentBalances[uid][newData.paidBy] = (currentBalances[uid][newData.paidBy] || 0) - shareAmount;
    }

    transaction.update(expenseRef, {
      ...newData,
      date: Timestamp.fromDate(newData.date),
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

    for (const [uid, shareAmount] of Object.entries(expenseData.splits)) {
      if (uid === expenseData.paidBy) continue;
      const payer = expenseData.paidBy;
      if (currentBalances[payer]) currentBalances[payer][uid] = (currentBalances[payer][uid] || 0) - shareAmount;
      if (currentBalances[uid]) currentBalances[uid][payer] = (currentBalances[uid][payer] || 0) + shareAmount;
    }

    transaction.delete(expenseRef);
    transaction.update(groupRef, {
      balances: currentBalances,
      totalExpenses: increment(-expenseData.baseCurrencyAmount),
      updatedAt: serverTimestamp(),
    });
  });
}
