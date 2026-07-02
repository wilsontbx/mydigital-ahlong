import { describe, it, expect, beforeEach, vi } from "vitest";
import { showDialog, showSettledModal, showMemberMenu } from "./dialogs";
import type { GroupState, Member } from "../core/types";

function setupDom() {
	document.body.innerHTML = `
		<div id="dialog-modal" hidden>
			<div id="dialog-emoji"></div>
			<div id="dialog-title"></div>
			<div id="dialog-quote"></div>
			<input id="dialog-input" />
			<div id="dialog-buttons"></div>
		</div>
		<div id="toast"></div>
	`;
}

function makeState(members: Member[] = []): GroupState {
	return { id: "g1", name: "Test", members, expenses: [], createdAt: 1000, updatedAt: 2000 };
}

beforeEach(() => {
	localStorage.clear();
	setupDom();
});

describe("dialogs", () => {
	it("showDialog error button confirms and closes", () => {
		const onConfirm = vi.fn();
		showDialog({ type: "error", title: "Oops", onConfirm });
		(document.querySelector(".dialog-btn-ok") as HTMLButtonElement).click();
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect((document.querySelector("#dialog-modal") as HTMLElement).hidden).toBe(true);
	});

	it("showDialog confirm calls callbacks", () => {
		const onConfirm = vi.fn();
		showDialog({ type: "confirm", title: "Confirm", onConfirm });
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect((document.querySelector("#dialog-modal") as HTMLElement).hidden).toBe(true);
	});

	it("showDialog confirm cancel branch runs", () => {
		const onCancel = vi.fn();
		showDialog({ type: "confirm", title: "Confirm", onCancel });
		(document.querySelector(".dialog-btn-cancel") as HTMLButtonElement).click();
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("showDialog prompt submits on Enter and supports allowEmpty", () => {
		const onConfirm = vi.fn();
		showDialog({ type: "prompt", title: "Name", defaultValue: " Alice ", onConfirm, allowEmpty: true });
		const input = document.querySelector("#dialog-input") as HTMLInputElement;
		input.value = " Bob ";
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
		expect(onConfirm).toHaveBeenCalledWith("Bob");
	});

	it("showDialog prompt escape and backdrop trigger cancel", () => {
		const onCancel = vi.fn();
		showDialog({ type: "prompt", title: "Name", onCancel });
		const input = document.querySelector("#dialog-input") as HTMLInputElement;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		expect(onCancel).toHaveBeenCalledTimes(1);

		showDialog({ type: "prompt", title: "Name", onCancel });
		const modal = document.querySelector("#dialog-modal") as HTMLDivElement;
		modal.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(onCancel).toHaveBeenCalledTimes(2);
	});

	it("showDialog prompt cancel button triggers cancel", () => {
		const onCancel = vi.fn();
		showDialog({ type: "prompt", title: "Name", onCancel });
		(document.querySelector(".dialog-btn-cancel") as HTMLButtonElement).click();
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("showMemberMenu remove payment calls onPaymentChange with empty", () => {
		const state = makeState([{ id: "test-1", name: "Alice", payment: "PayNow", avatar: "😎", updatedAt: 0 }]);
		const onPaymentChange = vi.fn();
		showMemberMenu(state, "Alice", { onAvatarChange: vi.fn(), onPaymentChange, onRemove: vi.fn(), onRename: vi.fn() });

		(document.querySelector(".dialog-btn-remove-payment") as HTMLButtonElement).click();
		expect(onPaymentChange).toHaveBeenCalledWith("");
	});

	it("showMemberMenu remove member calls onRemove", () => {
		const state = makeState([{ id: "test-1", name: "Alice", payment: "PayNow", avatar: "😀", updatedAt: 0 }]);
		const onRemove = vi.fn();
		showMemberMenu(state, "Alice", { onAvatarChange: vi.fn(), onPaymentChange: vi.fn(), onRemove, onRename: vi.fn() });

		(document.querySelector(".dialog-btn-remove") as HTMLButtonElement).click();
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();
		expect(onRemove).toHaveBeenCalled();
	});

	it("showMemberMenu payment edit calls onPaymentChange", () => {
		const state = makeState([{ id: "test-1", name: "Alice", payment: "PayNow", avatar: "😀", updatedAt: 0 }]);
		const onPaymentChange = vi.fn();
		showMemberMenu(state, "Alice", { onAvatarChange: vi.fn(), onPaymentChange, onRemove: vi.fn(), onRename: vi.fn() });

		(document.querySelector(".dialog-btn-payment") as HTMLButtonElement).click();
		const input = document.querySelector("#dialog-input") as HTMLInputElement;
		input.value = "DuitNow 999";
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();

		expect(onPaymentChange).toHaveBeenCalledWith("DuitNow 999");
	});

	it("showMemberMenu avatar button opens avatar picker", () => {
		const state = makeState([{ id: "test-1", name: "Alice", payment: "", avatar: "😀", updatedAt: 0 }]);
		showMemberMenu(state, "Alice", { onAvatarChange: vi.fn(), onPaymentChange: vi.fn(), onRemove: vi.fn(), onRename: vi.fn() });
		(document.querySelector(".dialog-btn-avatar") as HTMLButtonElement).click();
		expect(document.querySelector(".avatar-grid")).toBeTruthy();
	});

	it("showMemberMenu avatar picker calls onAvatarChange", () => {
		const state = makeState([{ id: "test-1", name: "Alice", payment: "", avatar: "😀", updatedAt: 0 }]);
		const onAvatarChange = vi.fn();
		showMemberMenu(state, "Alice", { onAvatarChange, onPaymentChange: vi.fn(), onRemove: vi.fn(), onRename: vi.fn() });
		(document.querySelector(".dialog-btn-avatar") as HTMLButtonElement).click();
		const first = document.querySelector("[data-avatar]") as HTMLButtonElement;
		first.click();
		expect(onAvatarChange).toHaveBeenCalledWith(first.dataset.avatar);
	});

	it("showMemberMenu rename triggers onRename callback", () => {
		const state = makeState([{ id: "test-1", name: "Alice", payment: "", avatar: "😀", updatedAt: 0 }]);
		const onRename = vi.fn();
		showMemberMenu(state, "Alice", { onAvatarChange: vi.fn(), onPaymentChange: vi.fn(), onRemove: vi.fn(), onRename });

		(document.querySelector(".dialog-btn-rename") as HTMLButtonElement).click();
		const input = document.querySelector("#dialog-input") as HTMLInputElement;
		input.value = "Alicia";
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();

		expect(onRename).toHaveBeenCalledWith("Alicia");
	});

	it("showMemberMenu close button hides modal", () => {
		const state = makeState([{ id: "test-1", name: "Alice", payment: "", avatar: "😀", updatedAt: 0 }]);
		showMemberMenu(state, "Alice", { onAvatarChange: vi.fn(), onPaymentChange: vi.fn(), onRemove: vi.fn(), onRename: vi.fn() });
		(document.querySelector(".dialog-btn-cancel") as HTMLButtonElement).click();
		expect((document.querySelector("#dialog-modal") as HTMLElement).hidden).toBe(true);
	});

	it("showSettledModal opens dialog with success", () => {
		showSettledModal("Bob", "Alice");
		expect((document.querySelector("#dialog-modal") as HTMLElement).hidden).toBe(false);
		expect(document.querySelector("#dialog-title")!.textContent).toContain("Bob paid Alice");
	});
});
