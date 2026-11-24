'use client';

import { useEffect, useState } from 'react';
import { collection, doc, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Expense } from '../types';

export function useExpenses(groupId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'groups', groupId, 'expenses'));

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];
        data.sort((a, b) => {
          const aDate = a.dates?.[0] || '';
          const bDate = b.dates?.[0] || '';
          return bDate.localeCompare(aDate);
        });
        setExpenses(data);
        setLoading(false);
      },
      (error) => {
        console.error('Expenses listener error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [groupId]);

  return { expenses, loading };
}

export function useExpense(groupId: string, expenseId: string) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'groups', groupId, 'expenses', expenseId),
      (snap) => {
        setExpense(snap.exists() ? ({ id: snap.id, ...snap.data() } as Expense) : null);
        setLoading(false);
      },
      (error) => {
        console.error('Expense listener error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [groupId, expenseId]);

  return { expense, loading };
}
