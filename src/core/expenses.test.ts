import { describe, it, expect } from "vitest";
import { addMember, removeMember, renameMember, addExpense, deleteExpense, calcBalances, simplifyDebts } from "./expenses";
import type { GroupState, Member, Expense } from "./types";

function makeState(): GroupState {
	return {
		id: "test-id",
		name: "Test Group",
		members: [],
		expenses: [],
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}

function makeMember(name: string, payment = "", avatar = "😀"): Member {
	return { name, payment, avatar };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
	return {
		id: "e1",
		desc: "Test",
		amount: 10,
		paidBy: "Alice",
		splitAmong: ["Alice", "Bob"],
		currency: "MYR",
		createdAt: Date.now(),
		deleted: false,
		...overrides,
	};
}

describe("expenses module", () => {
	it("addMember adds a unique trimmed name", () => {
		const state = makeState();

		addMember(state, "  Alice  ");
		addMember(state, "Alice");

		expect(state.members).toHaveLength(1);
		expect(state.members[0].name).toBe("Alice");
	});

	it("addMember stores payment info", () => {
		const state = makeState();
		addMember(state, "Alice", "DuitNow 012");
		expect(state.members[0].payment).toBe("DuitNow 012");
	});

	it("removeMember marks payer expenses as deleted and removes member from split", () => {
		const state = makeState();
		state.members = [makeMember("Alice"), makeMember("Bob"), makeMember("Charlie")];
		state.expenses = [
			makeExpense({ id: "1", desc: "Lunch", amount: 30, paidBy: "Alice", splitAmong: ["Alice", "Bob"] }),
			makeExpense({ id: "2", desc: "Snacks", amount: 15, paidBy: "Bob", splitAmong: ["Alice", "Bob", "Charlie"] }),
		];

		removeMember(state, "Alice");

		expect(state.members).toHaveLength(2);
		expect(state.members.map((m) => m.name)).toEqual(["Bob", "Charlie"]);
		expect(state.expenses[0].deleted).toBe(true);
		expect(state.expenses[1].splitAmong).toEqual(["Bob", "Charlie"]);
	});

	it("addExpense rounds amount to 2 decimal places", () => {
		const state = makeState();
		state.members = [makeMember("Alice"), makeMember("Bob")];

		addExpense(state, {
			desc: "Taxi",
			amount: 10.999,
			paidBy: "Alice",
			splitAmong: ["Alice", "Bob"],
			currency: "MYR",
		});

		expect(state.expenses).toHaveLength(1);
		expect(state.expenses[0].amount).toBe(11);
		expect(state.expenses[0].createdAt).toBeGreaterThan(0);
		expect(state.expenses[0].deleted).toBe(false);
	});

	it("addExpense falls back to all members when splitAmong is empty", () => {
		const state = makeState();
		state.members = [makeMember("Alice"), makeMember("Bob")];

		addExpense(state, {
			desc: "Shared",
			amount: 20,
			paidBy: "Alice",
			splitAmong: [],
			currency: "MYR",
		});

		expect(state.expenses[0].splitAmong).toEqual(["Alice", "Bob"]);
	});

	it("deleteExpense marks expense as deleted", () => {
		const state = makeState();
		state.expenses = [
			makeExpense({ id: "x1", desc: "Food", amount: 10 }),
			makeExpense({ id: "x2", desc: "Drink", amount: 5 }),
		];

		deleteExpense(state, "x1");

		expect(state.expenses[0].deleted).toBe(true);
		expect(state.expenses[0].amount).toBe(10);
		expect(state.expenses[1].deleted).toBe(false);
	});

	it("calcBalances computes expected payer/debtor balances and skips deleted", () => {
		const members = [makeMember("Alice"), makeMember("Bob")];
		const expenses = [
			makeExpense({ id: "e1", amount: 30, paidBy: "Alice", splitAmong: ["Alice", "Bob"] }),
			makeExpense({ id: "e2", amount: 100, paidBy: "Bob", splitAmong: ["Alice", "Bob"], deleted: true }),
		];

		const balances = calcBalances(expenses, members);

		expect(balances.Alice).toBe(15);
		expect(balances.Bob).toBe(-15);
	});

	it("renameMember updates name across members and all expenses", () => {
		const state = makeState();
		state.members = [makeMember("Alice"), makeMember("Bob")];
		state.expenses = [
			makeExpense({ id: "1", paidBy: "Alice", splitAmong: ["Alice", "Bob"] }),
		];

		renameMember(state, "Alice", "Alicia");

		expect(state.members[0].name).toBe("Alicia");
		expect(state.expenses[0].paidBy).toBe("Alicia");
		expect(state.expenses[0].splitAmong).toEqual(["Alicia", "Bob"]);
	});

	it("renameMember does nothing if old name not found", () => {
		const state = makeState();
		state.members = [makeMember("Alice")];

		renameMember(state, "Ghost", "NewName");

		expect(state.members[0].name).toBe("Alice");
	});

	it("simplifyDebts minimizes transfers for three members", () => {
		const members = [makeMember("Alice"), makeMember("Bob"), makeMember("Charlie")];
		const expenses = [
			makeExpense({ id: "e1", amount: 60, paidBy: "Alice", splitAmong: ["Alice", "Bob", "Charlie"] }),
		];

		const debts = simplifyDebts(expenses, members);

		expect(debts).toHaveLength(2);
		expect(debts).toEqual(
			expect.arrayContaining([
				{ from: "Bob", to: "Alice", amount: 20 },
				{ from: "Charlie", to: "Alice", amount: 20 },
			]),
		);
	});
});
