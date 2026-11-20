'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Group } from '../types';

export function useGroup(groupId: string | null) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'groups', groupId),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          setGroup({ id: snap.id, ...snap.data() } as Group);
        } else {
          setGroup(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Group listener error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [groupId]);

  return { group, loading };
}
