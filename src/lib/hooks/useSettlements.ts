'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Settlement } from '../types';

export function useSettlements(groupId: string | null) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setSettlements([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'groups', groupId, 'settlements'));

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Settlement[];
        data.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setSettlements(data);
        setLoading(false);
      },
      (error) => {
        console.error('Settlements listener error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [groupId]);

  return { settlements, loading };
}
