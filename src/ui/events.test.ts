import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupEvents } from "./events";
import type { GroupState } from "../core/types";

vi.mock("./dialogs", () => ({
	showDialog: vi.fn(),
	showMemberMenu: vi.fn(),
}));

vi.mock("./render", async () => {
	const actual = await vi.importActual<typeof import("./render")>("./render");
	return {
		...actual,
		render: vi.fn(),
		renderLanding: vi.fn(),
		getSymbol: vi.fn(() => "RM"),
		getIam: vi.fn(() => "Alice"),
		setIam: vi.fn(),
		setCurrencyOrder: vi.fn(),
	};
});

vi.mock("../core/state", async () => {
	const actual = await vi.importActual<typeof import("../core/state")>("../core/state");
	return {
		...actual,
		randomGroupName: vi.fn(() => "Random Group"),
		createEmptyState: vi.fn(() => ({ id: "new-id", name: "Random Group", members: [], expenses: [], createdAt: 1, updatedAt: 1 })),
		getMyGroupIds: vi.fn(() => ["test-id"]),
		addMyGroupId: vi.fn(),
		removeMyGroupId: vi.fn(),
		setActiveGroupId: vi.fn(),
		cacheGroup: vi.fn(),
		getCachedGroup: vi.fn(() => null),
		removeCachedGroup: vi.fn(),
	};
});

vi.mock("../core/expenses", () => ({
	addMember: vi.fn(),
	removeMember: vi.fn(),
	addExpense: vi.fn(),
	editExpense: vi.fn(),
	deleteExpense: vi.fn(),
	renameMember: vi.fn(),
}));

vi.mock("../shared/utils", async () => {
	const actual = await vi.importActual<typeof import("../shared/utils")>("../shared/utils");
	return {
		...actual,
		showToast: vi.fn(),
	};
});

vi.mock("./install", () => ({
	trackExpenseForInstall: vi.fn(),
}));

vi.mock("../core/sync", () => ({
	commit: vi.fn(),
	subscribeToGroup: vi.fn(),
	importGroup: vi.fn(async () => null),
	flushToFirebase: vi.fn(),
}));

vi.mock("../core/firebase", () => ({
	isFirebaseEnabled: vi.fn(() => true),
	deleteGroup: vi.fn(),
}));

import { showDialog, showMemberMenu } from "./dialogs";
import { addMember, addExpense } from "../core/expenses";
import { showToast } from "../shared/utils";
import { render, setCurrencyOrder } from "./render";
import { setActiveGroupId, addMyGroupId, cacheGroup, removeMyGroupId, removeCachedGroup } from "../core/state";
import { subscribeToGroup } from "../core/sync";

function setupDom() {
	document.body.innerHTML = `
		<div id="landing-page" hidden><button id="landing-new-group-btn"></button></div>
		<div id="app-content">
		<div id="group-tabs"><button id="new-group-btn">+</button></div>
		<h2 id="group-name"></h2>
		<button id="delete-group-btn"></button>
		<form id="add-member-form"><input id="member-input" /><input id="member-payment" /></form>
		<div id="members-list"><span data-member="test-1">Alice</span></div>
		<form id="add-expense-form">
			<input id="expense-desc" />
			<input id="expense-amount" />
			<select id="expense-category"><option value="">no category</option></select>
			<input id="expense-date" type="date" />
			<select id="paid-by"><option value="test-1">Alice</option></select>
			<select id="expense-currency"><option value="MYR">MYR</option></select>
			<select id="split-type"><option value="equal">Equal</option><option value="exact">Exact</option><option value="percent">Percent</option></select>
			<div id="split-checkboxes"><input type="checkbox" value="test-1" checked /></div>
			<div id="split-values" hidden></div>
		</form>
		<select id="filter-category"><option value="">All</option></select>
		<button id="filter-sort" data-sort="desc">🔽 Newest</button>
		<input id="filter-date-from" type="date" />
		<input id="filter-date-to" type="date" />
		<div id="category-breakdown"></div>
		<div id="expenses-list"><div class="expense-item" data-expense-id="e1">Lunch</div></div>
		<button id="share-btn"></button>
		<button id="share-whatsapp"></button>
		<button id="share-telegram"></button>
		<button id="share-twitter"></button>
		<button id="share-facebook"></button>
		<div id="settlement"></div>
		<div id="currency-pills"><button data-currency="MYR"></button><button data-currency="SGD"></button></div>
		<form id="import-link-form"><input id="import-link-input" type="url" /></form>
		</div>
	`;
}

function makeState(): GroupState {
	return {
		id: "test-id",
		name: "Trip",
		members: [{ id: "test-1", name: "Alice", payment: "DuitNow", avatar: "😀", updatedAt: 0 }, { id: "test-2", name: "Bob", payment: "", avatar: "😎", updatedAt: 0 }],
		expenses: [
			{
				id: "e1",
				type: "expense",
				desc: "Lunch",
				amount: 30,
				paidBy: "test-1",
				splitAmong: ["test-1", "test-2"],
				splitType: "equal",
				currency: "MYR",
				date: 1000,
				createdAt: 1000,
				updatedAt: 1000,
				deleted: false,
			},
		],
		createdAt: 1000,
		updatedAt: Date.now(),
	};
}

beforeEach(() => {
	setupDom();
	vi.clearAllMocks();
	vi.stubGlobal("open", vi.fn());
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText: vi.fn().mockResolvedValue(undefined) },
		configurable: true,
	});
});

describe("setupEvents", () => {
	it("creates new group from landing", () => {
		const state = makeState();
		const setState = vi.fn();
		setupEvents(() => state, setState);
		(document.querySelector("#landing-new-group-btn") as HTMLButtonElement).click();

		expect(showDialog).toHaveBeenCalled();
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		cfg.onConfirm("New G");
		expect(cacheGroup).toHaveBeenCalled();
		expect(addMyGroupId).toHaveBeenCalled();
		expect(setState).toHaveBeenCalled();
	});

	it("switches group tab by ID", () => {
		const state = makeState();
		const setState = vi.fn();
		setupEvents(() => state, setState);
		document.querySelector("#group-tabs")!.innerHTML = '<button data-group-id="g1">G1</button>';
		document.querySelector("#group-tabs [data-group-id]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(setActiveGroupId).toHaveBeenCalledWith("g1");
		expect(subscribeToGroup).toHaveBeenCalledWith("g1");
	});

	it("updates name via group-name prompt flow", () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		(document.querySelector("#group-name") as HTMLHeadingElement).click();
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		cfg.onConfirm("Renamed");
		expect(state.name).toBe("Renamed");
	});

	it("deletes group and cleans up", () => {
		const state = makeState();
		const setState = vi.fn();
		setupEvents(() => state, setState);
		(document.querySelector("#delete-group-btn") as HTMLButtonElement).click();

		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		cfg.onConfirm();
		expect(removeMyGroupId).toHaveBeenCalledWith("test-id");
		expect(removeCachedGroup).toHaveBeenCalledWith("test-id");
	});


	it("handles add member submit", () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		const input = document.querySelector("#member-input") as HTMLInputElement;
		input.value = "Charlie";
		document.querySelector("#add-member-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
		expect(addMember).toHaveBeenCalledWith(state, "Charlie", "");
	});

	it("shows member menu when member tag clicked", () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		(document.querySelector("[data-member]") as HTMLElement).click();
		expect(showMemberMenu).toHaveBeenCalled();
	});

	it("handles add expense submit", () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		(document.querySelector("#expense-desc") as HTMLInputElement).value = "Taxi";
		(document.querySelector("#expense-amount") as HTMLInputElement).value = "25";
		document.querySelector("#add-expense-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
		expect(addExpense).toHaveBeenCalled();
		expect(showToast).toHaveBeenCalled();
	});

	it("shows error dialog for invalid expense form", () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		document.querySelector("#add-expense-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
		expect(showDialog).toHaveBeenCalled();
		expect((showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].type).toBe("error");
	});

	it("opens action menu on expense contextmenu", () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		const item = document.querySelector("[data-expense-id]") as HTMLElement;
		item.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
		expect(showDialog).toHaveBeenCalled();
	});

	it("handles share link click", async () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		await (document.querySelector("#share-btn") as HTMLButtonElement).click();
		expect(navigator.clipboard.writeText).toHaveBeenCalled();
	});

	it("opens social share urls", async () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		(document.querySelector("#share-whatsapp") as HTMLButtonElement).click();
		(document.querySelector("#share-facebook") as HTMLButtonElement).click();
		await new Promise((r) => setTimeout(r, 10));
		expect(window.open).toHaveBeenCalledTimes(2);
	});

	it("reorders currency on drop", () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		const pills = document.querySelector("#currency-pills")!;
		const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
		Object.defineProperty(dropEvent, "preventDefault", { value: vi.fn() });
		pills.dispatchEvent(dropEvent);
		expect(setCurrencyOrder).toHaveBeenCalled();
		expect(render).toHaveBeenCalled();
	});

});
