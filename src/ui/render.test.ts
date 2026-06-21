import { describe, it, expect, beforeEach } from "vitest";
import {
	renderGroupSwitcher,
	renderGroup,
	renderMembers,
	renderExpenseForm,
	renderExpenses,
	renderSettlement,
	renderTxnLog,
	renderCurrencyPref,
	renderLanding,
	render,
	setCurrencyOrder,
	getOrderedCurrencies,
	getSymbol,
} from "./render";
import { addMyGroupId, setActiveGroupId, cacheGroup } from "../core/state";
import type { GroupState, Member, Expense } from "../core/types";

function setupDom() {
	document.body.innerHTML = `
		<div id="landing-page" hidden></div>
		<div id="app-content">
		<div id="group-tabs"></div>
		<h2 id="group-name"></h2>
		<button id="delete-group-btn"></button>
		<div id="members-list"></div>
		<div id="split-checkboxes"></div>
		<select id="paid-by"></select>
		<select id="expense-currency"></select>
		<input id="expense-date" type="date" />
		<select id="filter-category"><option value="">All</option></select>
		<button id="filter-sort" data-sort="desc">🔽 Newest</button>
		<input id="filter-date-from" type="date" />
		<input id="filter-date-to" type="date" />
		<div id="category-breakdown"></div>
		<div id="expenses-list"></div>
		<div id="settlement"></div>
		<div id="txn-log"></div>
		<div id="currency-pills"></div>
		</div>
	`;
}

function makeMember(name: string, payment = "", avatar = "😀"): Member {
	return { name, payment, avatar };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
	return {
		id: "e1",
		type: "expense",
		desc: "Lunch",
		amount: 30,
		paidBy: "Alice",
		splitAmong: ["Alice", "Bob"],
		splitType: "equal",
		currency: "MYR",
		date: 1000,
		createdAt: 1000,
		updatedAt: 1000,
		deleted: false,
		...overrides,
	};
}

function makeState(): GroupState {
	return {
		id: "test-id",
		name: "Trip",
		members: [makeMember("Alice"), makeMember("Bob", "DuitNow", "😎")],
		expenses: [makeExpense()],
		createdAt: 1000,
		updatedAt: Date.now(),
	};
}

beforeEach(() => {
	localStorage.clear();
	setupDom();
});

describe("render helpers", () => {
	it("gets symbol values", () => {
		expect(getSymbol("MYR")).toBe("RM");
		expect(getSymbol("X")).toBe("X");
		expect(getSymbol("")).toBe("");
	});

	it("sets and gets ordered currencies", () => {
		const order = ["USD", "MYR", "SGD", "CAD", "EUR", "GBP", "THB", "JPY", "KRW", "IDR", "AUD"];
		setCurrencyOrder(order);
		expect(getOrderedCurrencies()[0].code).toBe("USD");
	});
});

describe("render functions", () => {
	it("renders group switcher with tabs by ID", () => {
		const state = makeState();
		addMyGroupId("g1");
		addMyGroupId("g2");
		cacheGroup({ ...state, id: "g1", name: "A" });
		cacheGroup({ ...state, id: "g2", name: "B" });
		setActiveGroupId("g2");
		renderGroupSwitcher(state);

		const html = document.querySelector("#group-tabs")!.innerHTML;
		expect(html).toContain('data-group-id="g1"');
		expect(html).toContain('data-group-id="g2"');
		expect(html).toContain('id="new-group-btn"');
	});

	it("renders group header", () => {
		renderGroup(makeState());
		expect(document.querySelector("#group-name")!.textContent).toBe("Trip");
	});

	it("renders members with avatars/payment", () => {
		const state = makeState();
		renderMembers(state);

		expect(document.querySelector("#members-list")!.innerHTML).toContain("😎");
		expect(document.querySelector("#members-list")!.innerHTML).toContain("💳");
	});

	it("renders expense form and currency options", () => {
		renderExpenseForm(makeState());

		expect(document.querySelector("#split-checkboxes")!.innerHTML).toContain('value="Alice"');
		expect(document.querySelector("#paid-by")!.innerHTML).toContain('value="Alice"');
		expect(document.querySelector("#expense-currency")!.innerHTML).toContain("MYR");
	});

	it("renders expenses empty state", () => {
		const empty: GroupState = { id: "x", name: "X", members: [], expenses: [], createdAt: 1, updatedAt: 1 };
		renderExpenses(empty);
		expect(document.querySelector("#expenses-list")!.textContent).toContain("nothing here yet");
	});

	it("filters out deleted expenses from display", () => {
		const state = makeState();
		state.expenses = [
			makeExpense({ id: "e1", desc: "Visible" }),
			makeExpense({ id: "e2", desc: "Gone", deleted: true }),
		];
		renderExpenses(state);
		const html = document.querySelector("#expenses-list")!.innerHTML;
		expect(html).toContain("Visible");
		expect(html).not.toContain("Gone");
	});

	it("renders settlement empty and debts", () => {
		const empty: GroupState = { id: "x", name: "X", members: [], expenses: [], createdAt: 1, updatedAt: 1 };
		renderSettlement(empty);
		expect(document.querySelector("#settlement")!.textContent).toContain("add some expenses first");

		renderSettlement(makeState());
		expect(document.querySelector("#settlement")!.innerHTML).toContain("owes");
	});

	it("renders txn log states", () => {
		const empty: GroupState = { id: "x", name: "X", members: [], expenses: [], createdAt: 1, updatedAt: 1 };
		renderTxnLog(empty);
		expect(document.querySelector("#txn-log")!.textContent).toContain("no transactions yet");

		const state = makeState();
		state.expenses = [makeExpense({ id: "d1", desc: "Deleted item", deleted: true })];
		renderTxnLog(state);
		expect(document.querySelector("#txn-log")!.innerHTML).toContain("txn-deleted");
	});

	it("renders currency pills", () => {
		renderCurrencyPref();
		expect(document.querySelector("#currency-pills")!.innerHTML).toContain("currency-pill");
	});

	it("renderLanding shows landing page", () => {
		renderLanding();
		const landing = document.querySelector("#landing-page") as HTMLElement;
		const appContent = document.querySelector("#app-content") as HTMLElement;
		expect(landing.hidden).toBe(false);
		expect(appContent.hidden).toBe(true);
	});

	it("render shows app content and hides landing", () => {
		const state = makeState();
		addMyGroupId(state.id);
		cacheGroup(state);
		setActiveGroupId(state.id);
		render(state);
		const landing = document.querySelector("#landing-page") as HTMLElement;
		const appContent = document.querySelector("#app-content") as HTMLElement;
		expect(landing.hidden).toBe(true);
		expect(appContent.hidden).toBe(false);
	});
});
