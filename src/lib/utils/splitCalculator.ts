export function calculateEqualSplit(
  amount: number,
  participantIds: string[]
): Record<string, number> {
  const count = participantIds.length;
  if (count === 0) return {};

  const perPerson = Math.floor((amount / count) * 100) / 100;
  const remainder = Math.round((amount - perPerson * count) * 100) / 100;

  const splits: Record<string, number> = {};
  participantIds.forEach((id, index) => {
    splits[id] = index === 0 ? perPerson + remainder : perPerson;
  });

  return splits;
}

export function validateExactSplit(
  splits: Record<string, number>,
  totalAmount: number
): { valid: boolean; difference: number } {
  const sum = Object.values(splits).reduce((acc, val) => acc + val, 0);
  const difference = Math.round((totalAmount - sum) * 100) / 100;
  return { valid: Math.abs(difference) < 0.01, difference };
}

export function calculatePercentageSplit(
  amount: number,
  percentages: Record<string, number>
): Record<string, number> {
  const splits: Record<string, number> = {};
  const entries = Object.entries(percentages);

  let allocated = 0;
  entries.forEach(([id, pct], index) => {
    if (index === entries.length - 1) {
      splits[id] = Math.round((amount - allocated) * 100) / 100;
    } else {
      splits[id] = Math.round((amount * pct / 100) * 100) / 100;
      allocated += splits[id];
    }
  });

  return splits;
}

export function validatePercentages(percentages: Record<string, number>): {
  valid: boolean;
  total: number;
} {
  const total = Object.values(percentages).reduce((acc, val) => acc + val, 0);
  return { valid: Math.abs(total - 100) < 0.01, total };
}
