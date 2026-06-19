import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupEvents } from "./events";
import type { GroupState } from "../core/types";

vi.mock("./dialogs", () => ({
	showDialog: vi.fn(),
	showMemberMenu: vi.fn(),
	showPayUpModal: vi.fn(),
	showSettledModal: vi.fn(),
}));

vi.mock("./render", async () => {
	const actual = await vi.importActual<typeof import("./render")>("./render");
	return {
		...actual,
		render: vi.fn(),
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
		loadGroups: vi.fn(() => [{ name: "G1", members: [], expenses: [] }]),
		saveGroups: vi.fn(),
		getActiveIndex: vi.fn(() => 0),
		setActiveIndex: vi.fn(),
		loadPaymentMethods: vi.fn(() => ({ Alice: "DuitNow" })),
		savePaymentMethods: vi.fn(),
		decodeState: vi.fn(),
	};
});

vi.mock("../core/expenses", () => ({
	addMember: vi.fn(),
	removeMember: vi.fn(),
	addExpense: vi.fn(),
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
	importGroup: vi.fn((s) => s),
}));

import { showDialog, showMemberMenu, showPayUpModal } from "./dialogs";
import { addMember, addExpense } from "../core/expenses";
import { showToast } from "../shared/utils";
import { render, setIam, setCurrencyOrder } from "./render";
import { setActiveIndex, saveGroups, loadGroups, getActiveIndex, decodeState } from "../core/state";
import { importGroup } from "../core/sync";

function fireDragLikeEvent(type: string, target: Element, clientX = 0) {
	const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
	Object.defineProperty(ev, "dataTransfer", {
		value: { effectAllowed: "", dropEffect: "" },
		configurable: true,
	});
	target.dispatchEvent(ev);
	return ev;
}

function fireTouchMove(target: Element, clientX: number, clientY: number) {
	const ev = new Event("touchmove", { bubbles: true, cancelable: true });
	Object.defineProperty(ev, "touches", {
		value: [{ clientX, clientY }],
		configurable: true,
	});
	target.dispatchEvent(ev);
	return ev;
}

function setupDom() {
	document.body.innerHTML = `
		<div id="landing-page" hidden><button id="landing-new-group-btn"></button></div>
		<div id="app-content">
		<div id="group-tabs"><button id="new-group-btn">+</button></div>
		<h2 id="group-name"></h2>
		<button id="delete-group-btn"></button>
		<select id="iam-select"><option value="Alice">Alice</option></select>
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
		<button id="modal-close"></button>
		<div id="meme-modal" hidden></div>
		<button id="modal-settle-btn" data-from="Bob" data-to="Alice" data-currency="MYR" data-amount="15"></button>
		<div id="currency-pills"><button data-currency="MYR"></button><button data-currency="SGD"></button></div>
		<form id="import-link-form"><input id="import-link-input" type="url" /></form>
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
	setupDom();
	vi.clearAllMocks();
	vi.stubGlobal("open", vi.fn());
	Object.defineProperty(document, "elementFromPoint", {
		value: vi.fn(),
		configurable: true,
	});
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText: vi.fn().mockResolvedValue(undefined) },
		configurable: true,
	});
});

describe("setupEvents", () => {
	it("switches group tab and rerenders", () => {
		const state = makeState();
		const setState = vi.fn();
		setupEvents(() => state, setState);
		document.querySelector("#group-tabs")!.innerHTML = '<button data-group-idx="0">G1</button>';
		document.querySelector("#group-tabs [data-group-idx]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(setActiveIndex).toHaveBeenCalledWith(0);
		expect(setState).toHaveBeenCalled();
		expect(render).toHaveBeenCalled();
	});

	it("opens new group dialog and handles onConfirm", () => {
		const state = makeState();
		const setState = vi.fn();
		setupEvents(() => state, setState);
		(document.querySelector("#new-group-btn") as HTMLButtonElement).click();

		expect(showDialog).toHaveBeenCalled();
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		cfg.onConfirm("New G");
		expect(saveGroups).toHaveBeenCalled();
		expect(setState).toHaveBeenCalled();
	});

	it("landing page start group button opens dialog and creates group", () => {
		const state = makeState();
		const setState = vi.fn();
		setupEvents(() => state, setState);
		(document.querySelector("#landing-new-group-btn") as HTMLButtonElement).click();

		expect(showDialog).toHaveBeenCalled();
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(cfg.type).toBe("prompt");
		cfg.onConfirm("My New Group");
		expect(saveGroups).toHaveBeenCalled();
		expect(setState).toHaveBeenCalled();
		expect(render).toHaveBeenCalled();
	});

	it("deleting last group shows landing page", () => {
		const state = makeState();
		const setState = vi.fn();
		(loadGroups as unknown as ReturnType<typeof vi.fn>).mockReturnValue([state]);
		(getActiveIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue(0);
		setupEvents(() => state, setState);
		(document.querySelector("#delete-group-btn") as HTMLButtonElement).click();

		expect(showDialog).toHaveBeenCalled();
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(cfg.type).toBe("confirm");
		cfg.onConfirm();
		expect(saveGroups).toHaveBeenCalledWith([]);
		expect(setState).toHaveBeenCalled();
	});

	it("updates name via group-name prompt flow", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		(document.querySelector("#group-name") as HTMLHeadingElement).click();
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		cfg.onConfirm("Renamed");
		expect(state.name).toBe("Renamed");
	});

	it("changes iam selection", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		const iam = document.querySelector("#iam-select") as HTMLSelectElement;
		iam.value = "Alice";
		iam.dispatchEvent(new Event("change", { bubbles: true }));
		expect(setIam).toHaveBeenCalledWith("Alice");
	});

	it("handles add member submit", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		(document.querySelector("#member-input") as HTMLInputElement).value = "Charlie";
		(document.querySelector("#member-payment") as HTMLInputElement).value = "DuitNow";
		document.querySelector("#add-member-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

		expect(addMember).toHaveBeenCalled();
		expect(showToast).toHaveBeenCalled();
		expect((document.querySelector("#member-input") as HTMLInputElement).value).toBe("");
	});

	it("shows member menu when member tag clicked", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		document.querySelector("#members-list [data-member]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(showMemberMenu).toHaveBeenCalled();
	});

	it("handles add expense submit", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		(document.querySelector("#expense-desc") as HTMLInputElement).value = "Taxi";
		(document.querySelector("#expense-amount") as HTMLInputElement).value = "10";
		(document.querySelector("#paid-by") as HTMLSelectElement).value = "Alice";
		(document.querySelector("#expense-currency") as HTMLSelectElement).value = "MYR";

		document.querySelector("#add-expense-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
		expect(addExpense).toHaveBeenCalled();
	});

	it("shows error dialog for invalid expense form", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		(document.querySelector("#expense-desc") as HTMLInputElement).value = "";
		document.querySelector("#add-expense-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
		expect(showDialog).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
	});

	it("opens delete confirm dialog from expenses list", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		document.querySelector("[data-remove-expense]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(showDialog).toHaveBeenCalled();
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		cfg.onConfirm();
		expect(state.expenses[0].desc.startsWith("❌ Deleted")).toBe(true);
	});

	it("handles share link click", async () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		(document.querySelector("#share-btn") as HTMLButtonElement).click();
		await Promise.resolve();
		expect(showToast).toHaveBeenCalled();
	});

	it("handles share link clipboard failure", async () => {
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
			configurable: true,
		});
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		(document.querySelector("#share-btn") as HTMLButtonElement).click();
		await Promise.resolve();
		expect(showDialog).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
	});

	it("opens social share urls", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		(document.querySelector("#share-whatsapp") as HTMLButtonElement).click();
		(document.querySelector("#share-telegram") as HTMLButtonElement).click();
		(document.querySelector("#share-twitter") as HTMLButtonElement).click();
		(document.querySelector("#share-facebook") as HTMLButtonElement).click();
		expect(window.open).toHaveBeenCalledTimes(4);
	});

	it("opens pay up modal when debt item clicked", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		document.querySelector("#settlement")!.innerHTML = '<div data-debt-from="Bob" data-debt-to="Alice" data-debt-amount="RM15.00" data-debt-currency="MYR" data-debt-raw="15"></div>';
		document.querySelector("#settlement [data-debt-from]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(showPayUpModal).toHaveBeenCalledWith("Bob", "Alice", "RM15.00", "MYR", "15");
	});

	it("settles via debt settle button confirm flow", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		document.querySelector("#settlement")!.innerHTML = '<button data-settle-from="Bob" data-settle-to="Alice" data-settle-currency="MYR" data-settle-amount="15">S</button>';
		document.querySelector("#settlement [data-settle-from]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		const cfg = (showDialog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
		cfg.onConfirm();
		expect(addExpense).toHaveBeenCalled();
	});

	it("closes meme modal and settles from modal button", () => {
		vi.useFakeTimers();
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		const modal = document.querySelector("#meme-modal") as HTMLElement;
		modal.hidden = false;

		(document.querySelector("#modal-close") as HTMLButtonElement).click();
		expect(modal.hidden).toBe(true);

		modal.hidden = false;
		(document.querySelector("#modal-settle-btn") as HTMLButtonElement).click();
		expect(addExpense).toHaveBeenCalled();
		vi.runAllTimers();
		vi.useRealTimers();
	});

	it("reorders currency on drop", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		const pills = document.querySelector("#currency-pills")!;
		pills.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));
		expect(setCurrencyOrder).toHaveBeenCalled();
	});

	it("runs dragstart/dragend and dragover left-right branches", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		const container = document.querySelector("#currency-pills") as HTMLElement;
		container.innerHTML = '<button data-currency="MYR">MYR</button><button data-currency="SGD">SGD</button>';
		const myr = container.querySelector('[data-currency="MYR"]') as HTMLElement;
		const sgd = container.querySelector('[data-currency="SGD"]') as HTMLElement;

		fireDragLikeEvent("dragstart", myr);
		expect(myr.classList.contains("dragging")).toBe(true);

		sgd.getBoundingClientRect = vi.fn(() => ({ left: 100, width: 100 }) as DOMRect);
		fireDragLikeEvent("dragover", sgd, 120);
		expect(container.firstElementChild).toBe(myr);

		fireDragLikeEvent("dragover", sgd, 190);
		expect(container.lastElementChild).toBe(myr);

		container.dispatchEvent(new Event("dragend", { bubbles: true }));
		expect(myr.classList.contains("dragging")).toBe(false);
	});

	it("covers dragover early-return branches", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		const container = document.querySelector("#currency-pills") as HTMLElement;
		container.innerHTML = '<button data-currency="MYR">MYR</button>';

		// Target is null branch.
		fireDragLikeEvent("dragover", container, 120);
	});

	it("handles import link form with valid hash", () => {
		const state = makeState();
		const setState = vi.fn();
		(decodeState as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ id: "imported", name: "Imported", members: [], expenses: [] });
		setupEvents(() => state, setState);
		const input = document.querySelector("#import-link-input") as HTMLInputElement;
		input.value = "https://example.com/#validhash";
		document.querySelector("#import-link-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

		expect(importGroup).toHaveBeenCalled();
		expect(setState).toHaveBeenCalled();
	});

	it("handles import link form with no hash", () => {
		const state = makeState();
		setupEvents(() => state, vi.fn());
		const input = document.querySelector("#import-link-input") as HTMLInputElement;
		input.value = "https://example.com/nohash";
		document.querySelector("#import-link-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

		expect(showToast).toHaveBeenCalledWith("No group data found in that link 🤔");
	});

	it("handles split all/none toggle buttons", () => {
		const state = makeState();
		setupEvents(() => state, vi.fn());
		const container = document.querySelector("#split-checkboxes") as HTMLElement;
		container.innerHTML = `
			<button class="split-toggle" data-action="all">all</button>
			<button class="split-toggle" data-action="none">none</button>
			<label class="split-label checked"><input type="checkbox" value="Alice" checked></label>
			<label class="split-label checked"><input type="checkbox" value="Bob" checked></label>
		`;

		(container.querySelector('[data-action="none"]') as HTMLButtonElement).click();
		const checkboxes = [...container.querySelectorAll('input[type=checkbox]')] as HTMLInputElement[];
		expect(checkboxes.every((cb) => !cb.checked)).toBe(true);

		(container.querySelector('[data-action="all"]') as HTMLButtonElement).click();
		expect(checkboxes.every((cb) => cb.checked)).toBe(true);
	});

	it("closes meme modal on backdrop click", () => {
		const state = makeState();
		setupEvents(() => state, vi.fn());
		const modal = document.querySelector("#meme-modal") as HTMLElement;
		modal.hidden = false;

		modal.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(modal.hidden).toBe(true);
	});

	it("covers touch drag branches and touchend early return", () => {
		const state = makeState();
		setupEvents(
			() => state,
			() => {},
		);
		const container = document.querySelector("#currency-pills") as HTMLElement;
		container.innerHTML = '<button data-currency="MYR">MYR</button><button data-currency="SGD">SGD</button>';
		const myr = container.querySelector('[data-currency="MYR"]') as HTMLElement;
		const sgd = container.querySelector('[data-currency="SGD"]') as HTMLElement;

		// touchend early return when nothing dragged.
		container.dispatchEvent(new Event("touchend", { bubbles: true }));

		// Start drag.
		myr.dispatchEvent(new Event("touchstart", { bubbles: true }));
		expect(myr.classList.contains("dragging")).toBe(true);

		// elementFromPoint null branch.
		const elementFromPoint = document.elementFromPoint as unknown as ReturnType<typeof vi.fn>;
		elementFromPoint.mockReturnValueOnce(null);
		fireTouchMove(container, 120, 10);

		// same target branch.
		elementFromPoint.mockReturnValueOnce(myr);
		fireTouchMove(container, 120, 10);

		// move before midpoint branch.
		sgd.getBoundingClientRect = vi.fn(() => ({ left: 100, width: 100 }) as DOMRect);
		elementFromPoint.mockReturnValueOnce(sgd);
		fireTouchMove(container, 120, 10);

		// move after midpoint branch.
		elementFromPoint.mockReturnValueOnce(sgd);
		fireTouchMove(container, 190, 10);

		container.dispatchEvent(new Event("touchend", { bubbles: true }));
		expect(setCurrencyOrder).toHaveBeenCalled();
	});
});
