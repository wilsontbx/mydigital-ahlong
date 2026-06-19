import type { Expense, GroupState, Debt } from "./types";

let _id = Date.now();
function genId(): string {
	return (_id++).toString(36);
}

interface AddExpenseParams {
	desc: string;
	amount: number;
	paidBy: string;
	splitAmong: string[];
	currency: string;
	addedBy: string;
}

export function addExpense(state: GroupState, params: AddExpenseParams): GroupState {
	const now = new Date();
	const expense: Expense = {
		id: genId(),
		desc: params.desc,
		amount: Math.round(params.amount * 100) / 100,
		paidBy: params.paidBy,
		splitAmong: params.splitAmong.length ? params.splitAmong : [...state.members],
		currency: params.currency,
		addedBy: params.addedBy || "",
		date: now.toISOString().slice(0, 10),
		time: now.toTimeString().slice(0, 5),
	};
	state.expenses.push(expense);
	return state;
}

export function removeExpense(state: GroupState, id: string): GroupState {
	state.expenses = state.expenses.filter((e) => e.id !== id);
	return state;
}

export function addMember(state: GroupState, name: string): GroupState {
	const trimmed = name.trim();
	if (trimmed && !state.members.includes(trimmed)) {
		state.members.push(trimmed);
	}
	return state;
}

export function removeMember(state: GroupState, name: string): GroupState {
	state.members = state.members.filter((m) => m !== name);
	state.expenses = state.expenses.filter((e) => {
		if (e.paidBy === name) return false;
		e.splitAmong = e.splitAmong.filter((m) => m !== name);
		return e.splitAmong.length > 0;
	});
	return state;
}

export function renameMember(state: GroupState, oldName: string, newName: string): GroupState {
	const idx = state.members.indexOf(oldName);
	if (idx === -1) return state;
	state.members[idx] = newName;
	for (const e of state.expenses) {
		if (e.paidBy === oldName) e.paidBy = newName;
		if (e.addedBy === oldName) e.addedBy = newName;
		e.splitAmong = e.splitAmong.map((m) => (m === oldName ? newName : m));
	}
	return state;
}

// --- Balance calculation ---

export function calcBalances(expenses: Expense[], members: string[]): Record<string, number> {
	const balances: Record<string, number> = {};
	for (const m of members) balances[m] = 0;

	for (const exp of expenses) {
		const share = exp.amount / exp.splitAmong.length;
		balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
		for (const m of exp.splitAmong) {
			balances[m] = (balances[m] || 0) - share;
		}
	}

	return balances;
}

// --- Simplify debts (min transactions) ---

export function simplifyDebts(expenses: Expense[], members: string[]): Debt[] {
	const balances = calcBalances(expenses, members);
	const debts: Debt[] = [];

	const creditors: { person: string; amount: number }[] = [];
	const debtors: { person: string; amount: number }[] = [];

	for (const [person, amount] of Object.entries(balances)) {
		const rounded = Math.round(amount * 100) / 100;
		if (rounded > 0.01) creditors.push({ person, amount: rounded });
		else if (rounded < -0.01) debtors.push({ person, amount: -rounded });
	}

	creditors.sort((a, b) => b.amount - a.amount);
	debtors.sort((a, b) => b.amount - a.amount);

	let i = 0,
		j = 0;
	while (i < creditors.length && j < debtors.length) {
		const settle = Math.min(creditors[i].amount, debtors[j].amount);
		if (settle > 0.01) {
			debts.push({
				from: debtors[j].person,
				to: creditors[i].person,
				amount: Math.round(settle * 100) / 100,
			});
		}
		creditors[i].amount -= settle;
		debtors[j].amount -= settle;
		if (creditors[i].amount < 0.01) i++;
		if (debtors[j].amount < 0.01) j++;
	}

	return debts;
}
