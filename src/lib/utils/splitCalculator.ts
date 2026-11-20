function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function toRinggit(cents: number): number {
  return cents / 100;
}

export function calculateEqualSplit(
  amount: number,
  participantIds: string[]
): Record<string, number> {
  const count = participantIds.length;
  if (count === 0) return {};

  const totalCents = toCents(amount);
  const baseCents = Math.floor(totalCents / count);
  let remainderCents = totalCents - baseCents * count;

  const splits: Record<string, number> = {};
  participantIds.forEach((id) => {
    if (remainderCents > 0) {
      splits[id] = toRinggit(baseCents + 1);
      remainderCents--;
    } else {
      splits[id] = toRinggit(baseCents);
    }
  });

  return splits;
}

export function validateExactSplit(
  splits: Record<string, number>,
  totalAmount: number
): { valid: boolean; difference: number } {
  const totalCents = toCents(totalAmount);
  const sumCents = Object.values(splits).reduce((acc, val) => acc + toCents(val), 0);
  const diffCents = totalCents - sumCents;
  return { valid: diffCents === 0, difference: toRinggit(diffCents) };
}

export function calculatePercentageSplit(
  amount: number,
  percentages: Record<string, number>
): Record<string, number> {
  const totalCents = toCents(amount);
  const splits: Record<string, number> = {};
  const entries = Object.entries(percentages);

  let allocatedCents = 0;
  entries.forEach(([id, pct], index) => {
    if (index === entries.length - 1) {
      splits[id] = toRinggit(totalCents - allocatedCents);
    } else {
      const cents = Math.round(totalCents * pct / 100);
      splits[id] = toRinggit(cents);
      allocatedCents += cents;
    }
  });

  return splits;
}

export function validatePercentages(percentages: Record<string, number>): {
  valid: boolean;
  total: number;
} {
  const totalBps = Object.values(percentages).reduce(
    (acc, val) => acc + Math.round(val * 100),
    0
  );
  return { valid: totalBps === 10000, total: totalBps / 100 };
}
