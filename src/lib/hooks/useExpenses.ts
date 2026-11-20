'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
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
          const aTime = a.date?.seconds || 0;
          const bTime = b.date?.seconds || 0;
          return bTime - aTime;
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
