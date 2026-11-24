import type { Expense } from '../types';

export type Balances = Record<string, Record<string, number>>;

const EPSILON = 0.01;

/**
 * Rebuild the pairwise balance matrix from scratch, using exactly the same rule
 * that addExpense / updateExpense / deleteExpense apply incrementally:
 *   balances[payer][uid] += share   (uid owes payer)
 *   balances[uid][payer] -= share
 * For equal splits the share is baseCurrencyAmount / participants.length.
 */
export function computeBalancesFromExpenses(expenses: Expense[]): {
  balances: Balances;
  totalExpenses: number;
} {
  const balances: Balances = {};
  let totalExpenses = 0;

  for (const e of expenses) {
    const base = e.baseCurrencyAmount || e.amount || 0;
    totalExpenses += base;

    const participantCount = e.participants?.length || Object.keys(e.splits || {}).length;
    const equalShare = e.splitType === 'equal' && participantCount > 0 ? base / participantCount : null;

    for (const [uid, shareAmount] of Object.entries(e.splits || {})) {
      if (uid === e.paidBy) continue;
      const share = equalShare ?? shareAmount;
      if (!balances[e.paidBy]) balances[e.paidBy] = {};
      if (!balances[uid]) balances[uid] = {};
      balances[e.paidBy][uid] = (balances[e.paidBy][uid] || 0) + share;
      balances[uid][e.paidBy] = (balances[uid][e.paidBy] || 0) - share;
    }
  }

  return { balances, totalExpenses };
}

/** Net position per person: positive = is owed money, negative = owes money. */
export function netBalances(balances: Balances): Record<string, number> {
  const net: Record<string, number> = {};
  for (const [person, row] of Object.entries(balances)) {
    for (const amount of Object.values(row)) {
      net[person] = (net[person] || 0) + amount;
    }
  }
  return net;
}

export interface BalanceMismatch {
  from: string;
  to: string;
  stored: number;
  expected: number;
}

/** Pairwise differences where stored[from][to] differs from the recalculated value. */
export function diffBalances(stored: Balances, expected: Balances): BalanceMismatch[] {
  const people = new Set([...Object.keys(stored), ...Object.keys(expected)]);
  for (const row of [...Object.values(stored), ...Object.values(expected)]) {
    Object.keys(row).forEach((id) => people.add(id));
  }
  const ids = [...people].sort();
  const mismatches: BalanceMismatch[] = [];

  // Each pair is stored twice (a→b and b→a mirrored); check one direction only.
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const s = stored[a]?.[b] || 0;
      const e = expected[a]?.[b] || 0;
      if (Math.abs(s - e) >= EPSILON) {
        mismatches.push({ from: a, to: b, stored: s, expected: e });
      }
    }
  }
  return mismatches;
}

export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}
