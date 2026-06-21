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
import { addMember, addExpense, deleteExpense } from "../core/expenses";
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
		<div id="members-list"><span data-member="Alice">Alice</span></div>
		<form id="add-expense-form">
			<input id="expense-desc" />
			<input id="expense-amount" />
			<select id="paid-by"><option value="Alice">Alice</option></select>
			<select id="expense-currency"><option value="MYR">MYR</option></select>
			<div id="split-checkboxes"><input type="checkbox" value="Alice" checked /></div>
		</form>
		<div id="expenses-list"><button data-remove-expense="e1">Delete</button></div>
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
		members: [{ name: "Alice", payment: "DuitNow", avatar: "😀" }, { name: "Bob", payment: "", avatar: "😎" }],
		expenses: [
			{
				id: "e1",
				desc: "Lunch",
				amount: 30,
				paidBy: "Alice",
				splitAmong: ["Alice", "Bob"],
				currency: "MYR",
				createdAt: 1000,
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

	it("opens delete confirm dialog from expenses list", () => {
		const state = makeState();
		setupEvents(() => state, () => {});
		(document.querySelector("[data-remove-expense]") as HTMLButtonElement).click();
		expect(showDialog).toHaveBeenCalled();
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		cfg.onConfirm();
		expect(deleteExpense).toHaveBeenCalledWith(state, "e1");
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
