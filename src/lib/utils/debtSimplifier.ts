import { SimplifiedDebt } from '../types';

export function simplifyDebts(
  balances: Record<string, Record<string, number>>
): SimplifiedDebt[] {
  const netBalances: Record<string, number> = {};

  for (const [person, owedBy] of Object.entries(balances)) {
    for (const [other, amount] of Object.entries(owedBy)) {
      netBalances[person] = (netBalances[person] || 0) + amount;
      netBalances[other] = (netBalances[other] || 0) - amount;
    }
  }

  // Only count each pair once — the balances map is symmetric so divide by 2
  for (const key of Object.keys(netBalances)) {
    netBalances[key] = netBalances[key] / 2;
  }

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, amount] of Object.entries(netBalances)) {
    if (amount > 0.01) {
      creditors.push({ id, amount });
    } else if (amount < -0.01) {
      debtors.push({ id, amount: Math.abs(amount) });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const result: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const settlement = Math.min(debtors[i].amount, creditors[j].amount);

    if (settlement > 0.01) {
      result.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: Math.round(settlement * 100) / 100,
      });
    }

    debtors[i].amount -= settlement;
    creditors[j].amount -= settlement;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return result;
}
