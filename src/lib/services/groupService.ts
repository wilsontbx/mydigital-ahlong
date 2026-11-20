import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Group } from '../types';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createGroup(
  name: string,
  description: string,
  category: Group['category'],
  currency: string,
  creator: { uid: string; displayName: string; email: string }
): Promise<string> {
  const groupRef = doc(collection(db, 'groups'));
  const inviteCode = generateInviteCode();

  const groupData = {
    name,
    description,
    category,
    currency,
    createdBy: creator.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    memberIds: [creator.uid],
    members: {
      [creator.uid]: {
        displayName: creator.displayName,
        email: creator.email,
      },
    },
    inviteCode,
    exchangeRates: {},
    balances: {},
    totalExpenses: 0,
  };

  const batch = writeBatch(db);
  batch.set(groupRef, groupData);
  batch.set(doc(db, 'invites', inviteCode), {
    groupId: groupRef.id,
    createdBy: creator.uid,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', creator.uid), {
    uid: creator.uid,
    email: creator.email,
    displayName: creator.displayName,
    groupIds: arrayUnion(groupRef.id),
  }, { merge: true });
  await batch.commit();

  return groupRef.id;
}

export async function joinGroupByCode(
  code: string,
  user: { uid: string; displayName: string; email: string }
): Promise<string> {
  const inviteDoc = await getDoc(doc(db, 'invites', code.toUpperCase()));
  if (!inviteDoc.exists()) {
    throw new Error('Invalid invite code');
  }

  const { groupId } = inviteDoc.data();
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists()) {
    throw new Error('Group not found');
  }

  const groupData = groupSnap.data();
  if (groupData.memberIds.includes(user.uid)) {
    throw new Error('You are already a member of this group');
  }

  const batch = writeBatch(db);
  batch.update(groupRef, {
    memberIds: arrayUnion(user.uid),
    [`members.${user.uid}`]: {
      displayName: user.displayName,
      email: user.email,
    },
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    groupIds: arrayUnion(groupId),
  }, { merge: true });
  await batch.commit();

  return groupId;
}

export async function updateGroup(
  groupId: string,
  data: { name?: string; description?: string; exchangeRates?: Record<string, number> }
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function removeMember(
  groupId: string,
  userId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'groups', groupId), {
    memberIds: arrayRemove(userId),
    [`members.${userId}`]: deleteDoc as never,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', userId), {
    groupIds: arrayRemove(groupId),
  }, { merge: true });
  await batch.commit();
}

export async function deleteGroup(groupId: string): Promise<void> {
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  if (!groupSnap.exists()) return;

  const groupData = groupSnap.data();
  const batch = writeBatch(db);

  // Remove group from all members
  for (const memberId of groupData.memberIds) {
    batch.set(doc(db, 'users', memberId), {
      groupIds: arrayRemove(groupId),
    }, { merge: true });
  }

  // Delete invite
  if (groupData.inviteCode) {
    batch.delete(doc(db, 'invites', groupData.inviteCode));
  }

  // Delete the group
  batch.delete(doc(db, 'groups', groupId));
  await batch.commit();
}
