import { describe, it, expect, beforeEach } from "vitest";
import {
	renderGroupSwitcher,
	renderGroup,
	renderIam,
	renderMembers,
	renderExpenseForm,
	renderExpenses,
	renderSettlement,
	renderTxnLog,
	renderCurrencyPref,
	renderLanding,
	render,
	setIam,
	getIam,
	setCurrencyOrder,
	getOrderedCurrencies,
	getSymbol,
} from "./render";
import { saveGroups, setActiveIndex, savePaymentMethods, saveAvatars } from "../core/state";
import type { GroupState } from "../core/types";

function setupDom() {
	document.body.innerHTML = `
		<div id="landing-page" hidden></div>
		<div id="app-content">
		<div id="group-tabs"></div>
		<h2 id="group-name"></h2>
		<button id="delete-group-btn"></button>
		<select id="iam-select"></select>
		<div id="members-list"></div>
		<div id="split-checkboxes"></div>
		<select id="paid-by"></select>
		<select id="expense-currency"></select>
		<div id="expenses-list"></div>
		<div id="settlement"></div>
		<div id="txn-log"></div>
		<div id="currency-pills"></div>
		</div>
	`;
}

function makeState(): GroupState {
	return {
		id: "test-id",
		name: "Trip",
		members: ["Alice", "Bob"],
		expenses: [
			{
				id: "e1",
				desc: "Lunch",
				amount: 30,
				paidBy: "Alice",
				splitAmong: ["Alice", "Bob"],
				currency: "MYR",
				addedBy: "Alice",
				date: "2026-06-11",
				time: "10:00",
			},
		],
		updatedAt: Date.now(),
	};
}

beforeEach(() => {
	localStorage.clear();
	setupDom();
});

describe("render helpers", () => {
	it("gets symbol and iam values", () => {
		expect(getSymbol("MYR")).toBe("RM");
		expect(getSymbol("X")).toBe("X");
		expect(getSymbol("")).toBe("");

		setIam("Alice");
		expect(getIam()).toBe("Alice");
	});

	it("sets and gets ordered currencies", () => {
		const order = ["USD", "MYR", "SGD", "CAD", "EUR", "GBP", "THB", "JPY", "KRW", "IDR", "AUD"];
		setCurrencyOrder(order);
		expect(getOrderedCurrencies()[0].code).toBe("USD");
	});
});

describe("render functions", () => {
	it("renders group switcher", () => {
		saveGroups([
			{ id: "test-1", name: "A", members: [], expenses: [], updatedAt: Date.now() },
			{ id: "test-2", name: "B", members: [], expenses: [], updatedAt: Date.now() },
		]);
		setActiveIndex(1);
		renderGroupSwitcher(makeState());

		const html = document.querySelector("#group-tabs")!.innerHTML;
		expect(html).toContain('data-group-idx="0"');
		expect(html).toContain('class="group-tab active"');
		expect(html).toContain('id="new-group-btn"');
	});

	it("renders group header", () => {
		saveGroups([{ id: "test-1", name: "Only", members: [], expenses: [], updatedAt: Date.now() }]);
		renderGroup({ id: "test-1", name: "Only", members: [], expenses: [], updatedAt: Date.now() });
		expect(document.querySelector("#group-name")!.textContent).toBe("Only");
	});

	it("renders iam and members with avatars/payment", () => {
		setIam("Bob");
		savePaymentMethods({ Bob: "DuitNow" });
		saveAvatars({ Bob: "😎" });
		renderIam(makeState());
		renderMembers(makeState());

		expect(document.querySelector("#iam-select")!.innerHTML).toContain('value="Bob" selected');
		expect(document.querySelector("#members-list")!.innerHTML).toContain("😎");
		expect(document.querySelector("#members-list")!.innerHTML).toContain("💳");
	});

	it("renders expense form and currency options", () => {
		setIam("Alice");
		renderExpenseForm(makeState());

		expect(document.querySelector("#split-checkboxes")!.innerHTML).toContain('value="Alice"');
		expect(document.querySelector("#paid-by")!.innerHTML).toContain('value="Alice" selected');
		expect(document.querySelector("#expense-currency")!.innerHTML).toContain("MYR");
	});

	it("renders expenses empty state", () => {
		renderExpenses({ id: "test-1", name: "X", members: [], expenses: [], updatedAt: Date.now() });
		expect(document.querySelector("#expenses-list")!.textContent).toContain("nothing here yet");
	});

	it("renders expenses with locked marker after settlement", () => {
		setIam("Alice");
		const state: GroupState = {
			id: "test-id",
			name: "Trip",
			members: ["Alice", "Bob"],
			expenses: [
				{
					id: "e1",
					desc: "Old",
					amount: 10,
					paidBy: "Alice",
					splitAmong: ["Alice", "Bob"],
					currency: "MYR",
					addedBy: "Alice",
					date: "2026-06-11",
					time: "10:00",
				},
				{
					id: "s1",
					desc: "💸 Settlement: Bob → Alice",
					amount: 5,
					paidBy: "Bob",
					splitAmong: ["Alice"],
					currency: "MYR",
					addedBy: "Bob",
					date: "2026-06-11",
					time: "11:00",
				},
			],
			updatedAt: Date.now(),
		};
		renderExpenses(state);
		expect(document.querySelector("#expenses-list")!.innerHTML).toContain("🔒 settled");
	});

	it("renders settlement empty and debts", () => {
		renderSettlement({ id: "test-1", name: "X", members: [], expenses: [], updatedAt: Date.now() });
		expect(document.querySelector("#settlement")!.textContent).toContain("add some expenses first");

		renderSettlement(makeState());
		expect(document.querySelector("#settlement")!.innerHTML).toContain("owes");
	});

	it("renders txn log states", () => {
		renderTxnLog({ id: "test-1", name: "X", members: [], expenses: [], updatedAt: Date.now() });
		expect(document.querySelector("#txn-log")!.textContent).toContain("no transactions yet");

		const deleted = {
			...makeState(),
			expenses: [
				{
					id: "x",
					desc: "❌ Deleted: Lunch",
					amount: 0,
					originalAmount: 30,
					paidBy: "Alice",
					splitAmong: [],
					currency: "MYR",
					addedBy: "Alice",
					date: "2026-06-11",
					time: "12:00",
				},
			],
		};
		renderTxnLog(deleted);
		expect(document.querySelector("#txn-log")!.innerHTML).toContain("txn-deleted");
		expect(document.querySelector("#txn-log")!.innerHTML).toContain("RM30.00");
	});

	it("renders currency pills and orchestrator does not persist", () => {
		saveGroups([makeState()]);
		setActiveIndex(0);
		renderCurrencyPref();
		expect(document.querySelector("#currency-pills")!.innerHTML).toContain("currency-pill");

		const state = makeState();
		render(state);
		// render() is now pure — it should NOT write to the URL hash
		expect(window.location.hash).toBe("");
	});

	it("shows landing page when no groups exist", () => {
		saveGroups([]);
		renderLanding();
		const landing = document.querySelector("#landing-page") as HTMLElement;
		const appContent = document.querySelector("#app-content") as HTMLElement;
		expect(landing.hidden).toBe(false);
		expect(appContent.hidden).toBe(true);
	});

	it("hides landing page when groups exist", () => {
		saveGroups([makeState()]);
		renderLanding();
		const landing = document.querySelector("#landing-page") as HTMLElement;
		const appContent = document.querySelector("#app-content") as HTMLElement;
		expect(landing.hidden).toBe(true);
		expect(appContent.hidden).toBe(false);
	});

	it("clears URL hash when no groups exist", () => {
		window.location.hash = "#somedata";
		saveGroups([]);
		renderLanding();
		expect(window.location.hash).toBe("");
	});

	it("render returns early when no groups exist without rendering app content", () => {
		saveGroups([] as GroupState[]);
		const state = makeState();
		render(state);
		const landing = document.querySelector("#landing-page") as HTMLElement;
		expect(landing.hidden).toBe(false);
		// group-name should remain unchanged since render skipped
		expect(document.querySelector("#group-name")!.textContent).toBe("");
	});
});
