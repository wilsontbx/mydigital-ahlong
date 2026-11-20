import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export async function settleUp(
  groupId: string,
  fromUserId: string,
  toUserId: string,
  amount: number,
  createdBy: string
): Promise<string> {
  const settlementRef = doc(collection(db, 'groups', groupId, 'settlements'));
  const groupRef = doc(db, 'groups', groupId);

  await runTransaction(db, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error('Group not found');

    const currentBalances = groupSnap.data().balances || {};

    if (!currentBalances[fromUserId]) currentBalances[fromUserId] = {};
    if (!currentBalances[toUserId]) currentBalances[toUserId] = {};

    // fromUser pays toUser, reducing fromUser's debt
    currentBalances[fromUserId][toUserId] = (currentBalances[fromUserId][toUserId] || 0) + amount;
    currentBalances[toUserId][fromUserId] = (currentBalances[toUserId][fromUserId] || 0) - amount;

    transaction.set(settlementRef, {
      fromUserId,
      toUserId,
      amount,
      createdBy,
      createdAt: serverTimestamp(),
    });

    transaction.update(groupRef, {
      balances: currentBalances,
      updatedAt: serverTimestamp(),
    });
  });

  return settlementRef.id;
}
