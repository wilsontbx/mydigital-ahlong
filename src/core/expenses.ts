import type { Expense, ExpenseType, GroupState, Debt, Member, SplitType } from "./types";

let _id = Date.now();
function genId(): string {
	return (_id++).toString(36);
}

interface AddExpenseParams {
	type?: ExpenseType;
	desc: string;
	amount: number;
	paidBy: string;
	splitAmong: string[];
	splitType?: SplitType;
	splitValues?: Record<string, number>;
	currency: string;
	category?: string;
	date?: number;
}

export function addExpense(state: GroupState, params: AddExpenseParams): GroupState {
	const now = Date.now();
	const splitAmong = params.splitAmong.length ? params.splitAmong : state.members.map((m) => m.name);
	const expense: Expense = {
		id: genId(),
		type: params.type || "expense",
		desc: params.desc,
		amount: Math.round(params.amount * 100) / 100,
		paidBy: params.paidBy,
		splitAmong,
		splitType: params.splitType || "equal",
		splitValues: params.splitValues,
		currency: params.currency,
		category: params.category,
		date: params.date || now,
		createdAt: now,
		updatedAt: now,
		deleted: false,
	};
	state.expenses.push(expense);
	return state;
}

export function editExpense(state: GroupState, id: string, params: Partial<AddExpenseParams>): GroupState {
	const expense = state.expenses.find((e) => e.id === id);
	if (!expense) return state;
	if (params.desc !== undefined) expense.desc = params.desc;
	if (params.amount !== undefined) expense.amount = Math.round(params.amount * 100) / 100;
	if (params.paidBy !== undefined) expense.paidBy = params.paidBy;
	if (params.splitAmong !== undefined) expense.splitAmong = params.splitAmong.length ? params.splitAmong : state.members.map((m) => m.name);
	if (params.splitType !== undefined) expense.splitType = params.splitType;
	if (params.splitValues !== undefined) expense.splitValues = params.splitValues;
	if (params.currency !== undefined) expense.currency = params.currency;
	if (params.category !== undefined) expense.category = params.category;
	if (params.date !== undefined) expense.date = params.date;
	expense.updatedAt = Date.now();
	return state;
}

export function deleteExpense(state: GroupState, id: string): GroupState {
	const expense = state.expenses.find((e) => e.id === id);
	if (expense) expense.deleted = true;
	return state;
}

export function addMember(state: GroupState, name: string, payment = ""): GroupState {
	const trimmed = name.trim();
	if (trimmed && !state.members.some((m) => m.name === trimmed)) {
		const member: Member = { name: trimmed, payment, avatar: "😀" };
		state.members.push(member);
	}
	return state;
}

export function removeMember(state: GroupState, name: string): GroupState {
	state.members = state.members.filter((m) => m.name !== name);
	for (const e of state.expenses) {
		if (e.paidBy === name) e.deleted = true;
		e.splitAmong = e.splitAmong.filter((m) => m !== name);
		if (e.splitAmong.length === 0 && !e.deleted) e.deleted = true;
	}
	return state;
}

export function renameMember(state: GroupState, oldName: string, newName: string): GroupState {
	const member = state.members.find((m) => m.name === oldName);
	if (!member) return state;
	member.name = newName;
	for (const e of state.expenses) {
		if (e.paidBy === oldName) e.paidBy = newName;
		e.splitAmong = e.splitAmong.map((m) => (m === oldName ? newName : m));
	}
	return state;
}

// --- Balance calculation (excludes deleted expenses) ---

export function calcBalances(expenses: Expense[], members: Member[]): Record<string, number> {
	const balances: Record<string, number> = {};
	for (const m of members) balances[m.name] = 0;

	for (const exp of expenses) {
		if (exp.deleted) continue;
		balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;

		const splitType = exp.splitType || "equal";
		if (splitType === "exact" && exp.splitValues) {
			for (const m of exp.splitAmong) {
				balances[m] = (balances[m] || 0) - (exp.splitValues[m] || 0);
			}
		} else if (splitType === "percent" && exp.splitValues) {
			for (const m of exp.splitAmong) {
				const pct = exp.splitValues[m] || 0;
				balances[m] = (balances[m] || 0) - (exp.amount * pct) / 100;
			}
		} else {
			const share = exp.amount / exp.splitAmong.length;
			for (const m of exp.splitAmong) {
				balances[m] = (balances[m] || 0) - share;
			}
		}
	}

	return balances;
}

// --- Simplify debts (min transactions) ---

export function simplifyDebts(expenses: Expense[], members: Member[]): Debt[] {
	const memberNames = members.map((m) => m.name);
	const balances = calcBalances(expenses, members);
	const debts: Debt[] = [];

	const creditors: { person: string; amount: number }[] = [];
	const debtors: { person: string; amount: number }[] = [];

	for (const person of memberNames) {
		const rounded = Math.round((balances[person] || 0) * 100) / 100;
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
