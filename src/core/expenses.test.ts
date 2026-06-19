import { describe, it, expect } from "vitest";
import { addMember, removeMember, renameMember, addExpense, removeExpense, calcBalances, simplifyDebts } from "./expenses";
import type { GroupState } from "./types";

function makeState(): GroupState {
	return {
		id: "test-id",
		name: "Test Group",
		members: [],
		expenses: [],
		updatedAt: Date.now(),
	};
}

describe("expenses module", () => {
	it("addMember adds a unique trimmed name", () => {
		const state = makeState();

		addMember(state, "  Alice  ");
		addMember(state, "Alice");

		expect(state.members).toEqual(["Alice"]);
	});

	it("removeMember removes payer expenses and removes member from split list", () => {
		const state = makeState();
		state.members = ["Alice", "Bob", "Charlie"];
		state.expenses = [
			{
				id: "1",
				desc: "Lunch",
				amount: 30,
				paidBy: "Alice",
				splitAmong: ["Alice", "Bob"],
				currency: "MYR",
				addedBy: "Alice",
				date: "2026-06-11",
				time: "10:00",
			},
			{
				id: "2",
				desc: "Snacks",
				amount: 15,
				paidBy: "Bob",
				splitAmong: ["Alice", "Bob", "Charlie"],
				currency: "MYR",
				addedBy: "Bob",
				date: "2026-06-11",
				time: "11:00",
			},
		];

		removeMember(state, "Alice");

		expect(state.members).toEqual(["Bob", "Charlie"]);
		expect(state.expenses).toHaveLength(1);
		expect(state.expenses[0].paidBy).toBe("Bob");
		expect(state.expenses[0].splitAmong).toEqual(["Bob", "Charlie"]);
	});

	it("addExpense rounds amount to 2 decimal places", () => {
		const state = makeState();
		state.members = ["Alice", "Bob"];

		addExpense(state, {
			desc: "Taxi",
			amount: 10.999,
			paidBy: "Alice",
			splitAmong: ["Alice", "Bob"],
			currency: "MYR",
			addedBy: "Alice",
		});

		expect(state.expenses).toHaveLength(1);
		expect(state.expenses[0].amount).toBe(11);
	});

	it("addExpense falls back to all members when splitAmong is empty", () => {
		const state = makeState();
		state.members = ["Alice", "Bob"];

		addExpense(state, {
			desc: "Shared",
			amount: 20,
			paidBy: "Alice",
			splitAmong: [],
			currency: "MYR",
			addedBy: "Alice",
		});

		expect(state.expenses[0].splitAmong).toEqual(["Alice", "Bob"]);
	});

	it("removeExpense filters out expense by id", () => {
		const state = makeState();
		state.expenses = [
			{
				id: "x1",
				desc: "Food",
				amount: 10,
				paidBy: "Alice",
				splitAmong: ["Alice"],
				currency: "MYR",
				addedBy: "Alice",
				date: "2026-06-11",
				time: "10:00",
			},
			{
				id: "x2",
				desc: "Drink",
				amount: 5,
				paidBy: "Bob",
				splitAmong: ["Bob"],
				currency: "MYR",
				addedBy: "Bob",
				date: "2026-06-11",
				time: "11:00",
			},
		];

		removeExpense(state, "x1");

		expect(state.expenses).toHaveLength(1);
		expect(state.expenses[0].id).toBe("x2");
	});

	it("calcBalances computes expected payer/debtor balances", () => {
		const balances = calcBalances(
			[
				{
					id: "e1",
					desc: "Dinner",
					amount: 30,
					paidBy: "Alice",
					splitAmong: ["Alice", "Bob"],
					currency: "MYR",
					addedBy: "Alice",
					date: "2026-06-11",
					time: "12:00",
				},
			],
			["Alice", "Bob"],
		);

		expect(balances.Alice).toBe(15);
		expect(balances.Bob).toBe(-15);
	});

	it("renameMember updates name across members and all expenses", () => {
		const state = makeState();
		state.members = ["Alice", "Bob"];
		state.expenses = [
			{
				id: "1",
				desc: "Lunch",
				amount: 30,
				paidBy: "Alice",
				splitAmong: ["Alice", "Bob"],
				currency: "MYR",
				addedBy: "Alice",
				date: "2026-06-11",
				time: "10:00",
			},
		];

		renameMember(state, "Alice", "Alicia");

		expect(state.members).toEqual(["Alicia", "Bob"]);
		expect(state.expenses[0].paidBy).toBe("Alicia");
		expect(state.expenses[0].addedBy).toBe("Alicia");
		expect(state.expenses[0].splitAmong).toEqual(["Alicia", "Bob"]);
	});

	it("renameMember does nothing if old name not found", () => {
		const state = makeState();
		state.members = ["Alice"];

		renameMember(state, "Ghost", "NewName");

		expect(state.members).toEqual(["Alice"]);
	});

	it("simplifyDebts minimizes transfers for three members", () => {
		const expenses = [
			{
				id: "e1",
				desc: "Hotel",
				amount: 60,
				paidBy: "Alice",
				splitAmong: ["Alice", "Bob", "Charlie"],
				currency: "MYR",
				addedBy: "Alice",
				date: "2026-06-11",
				time: "12:00",
			},
		];

		const debts = simplifyDebts(expenses, ["Alice", "Bob", "Charlie"]);

		expect(debts).toHaveLength(2);
		expect(debts).toEqual(
			expect.arrayContaining([
				{ from: "Bob", to: "Alice", amount: 20 },
				{ from: "Charlie", to: "Alice", amount: 20 },
			]),
		);
	});
});
