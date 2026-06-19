import { describe, it, expect, beforeEach, vi } from "vitest";
import { showDialog, showAvatarPicker, showPayUpModal, showSettledModal, showMemberMenu } from "./dialogs";
import { saveAvatars, savePaymentMethods, loadPaymentMethods, loadAvatars } from "../core/state";

function setupDom() {
	document.body.innerHTML = `
		<div id="dialog-modal" hidden>
			<div id="dialog-emoji"></div>
			<div id="dialog-title"></div>
			<div id="dialog-quote"></div>
			<input id="dialog-input" />
			<div id="dialog-buttons"></div>
		</div>
		<div id="meme-modal" hidden></div>
		<div id="modal-meme"></div>
		<div id="modal-msg"></div>
		<div id="modal-quote"></div>
		<button id="modal-settle-btn"></button>
		<div id="toast"></div>
	`;
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

	it("showMemberMenu removes payment", () => {
		saveAvatars({ Alice: "😎" });
		savePaymentMethods({ Alice: "PayNow" });
		const onRender = vi.fn();
		showMemberMenu("Alice", "PayNow", onRender, vi.fn());

		(document.querySelector(".dialog-btn-remove-payment") as HTMLButtonElement).click();
		expect(loadPaymentMethods().Alice).toBeUndefined();
		expect(onRender).toHaveBeenCalled();
	});

	it("showMemberMenu remove member path executes callback", () => {
		saveAvatars({ Alice: "😀" });
		savePaymentMethods({ Alice: "PayNow" });
		const onRender = vi.fn();
		const onRemove = vi.fn();
		showMemberMenu("Alice", "PayNow", onRender, onRemove);

		(document.querySelector(".dialog-btn-remove") as HTMLButtonElement).click();
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();
		expect(onRemove).toHaveBeenCalledWith("Alice");
	});

	it("showMemberMenu payment edit updates payment", () => {
		saveAvatars({ Alice: "😀" });
		savePaymentMethods({ Alice: "PayNow" });
		const onRender = vi.fn();
		showMemberMenu("Alice", "PayNow", onRender, vi.fn());

		(document.querySelector(".dialog-btn-payment") as HTMLButtonElement).click();
		const input = document.querySelector("#dialog-input") as HTMLInputElement;
		input.value = "DuitNow 999";
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();

		expect(loadPaymentMethods().Alice).toBe("DuitNow 999");
		expect(onRender).toHaveBeenCalled();
	});

	it("showMemberMenu payment edit with empty value removes payment", () => {
		saveAvatars({ Alice: "😀" });
		savePaymentMethods({ Alice: "PayNow" });
		const onRender = vi.fn();
		showMemberMenu("Alice", "PayNow", onRender, vi.fn());

		(document.querySelector(".dialog-btn-payment") as HTMLButtonElement).click();
		const input = document.querySelector("#dialog-input") as HTMLInputElement;
		input.value = "   ";
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();

		expect(loadPaymentMethods().Alice).toBeUndefined();
		expect(onRender).toHaveBeenCalled();
	});

	it("showMemberMenu avatar button opens avatar picker", () => {
		saveAvatars({ Alice: "😀" });
		showMemberMenu("Alice", "", vi.fn(), vi.fn());
		(document.querySelector(".dialog-btn-avatar") as HTMLButtonElement).click();
		expect(document.querySelector(".avatar-grid")).toBeTruthy();
	});

	it("showMemberMenu rename triggers onRename callback", () => {
		saveAvatars({ Alice: "😀" });
		const onRender = vi.fn();
		const onRemove = vi.fn();
		const onRename = vi.fn();
		showMemberMenu("Alice", "", onRender, onRemove, onRename);

		(document.querySelector(".dialog-btn-rename") as HTMLButtonElement).click();
		const input = document.querySelector("#dialog-input") as HTMLInputElement;
		input.value = "Alicia";
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();

		expect(onRename).toHaveBeenCalledWith("Alice", "Alicia");
	});

	it("showMemberMenu rename does nothing if same name", () => {
		saveAvatars({ Alice: "😀" });
		const onRename = vi.fn();
		showMemberMenu("Alice", "", vi.fn(), vi.fn(), onRename);

		(document.querySelector(".dialog-btn-rename") as HTMLButtonElement).click();
		const input = document.querySelector("#dialog-input") as HTMLInputElement;
		input.value = "Alice";
		(document.querySelector(".dialog-btn-confirm") as HTMLButtonElement).click();

		expect(onRename).not.toHaveBeenCalled();
	});

	it("showMemberMenu close button hides modal", () => {
		saveAvatars({ Alice: "😀" });
		showMemberMenu("Alice", "", vi.fn(), vi.fn());
		(document.querySelector(".dialog-btn-cancel") as HTMLButtonElement).click();
		expect((document.querySelector("#dialog-modal") as HTMLElement).hidden).toBe(true);
	});

	it("showAvatarPicker updates avatar", () => {
		saveAvatars({ Alice: "😀" });
		const onRender = vi.fn();
		showAvatarPicker("Alice", onRender);
		const first = document.querySelector("[data-avatar]") as HTMLButtonElement;
		first.click();
		expect(loadAvatars().Alice).toBe(first.dataset.avatar);
		expect(onRender).toHaveBeenCalled();
	});

	it("showPayUpModal fills modal content and datasets", () => {
		savePaymentMethods({ Alice: "DuitNow 123" });
		showPayUpModal("Bob", "Alice", "RM15.00", "MYR", "15.00");

		const btn = document.querySelector("#modal-settle-btn") as HTMLButtonElement;
		expect((document.querySelector("#meme-modal") as HTMLElement).hidden).toBe(false);
		expect(document.querySelector("#modal-msg")!.innerHTML).toContain("owes");
		expect(btn.dataset.from).toBe("Bob");
		expect(btn.dataset.to).toBe("Alice");
		expect(btn.dataset.currency).toBe("MYR");
		expect(btn.dataset.amount).toBe("15.00");
	});

	it("showSettledModal hides settle button and opens modal", () => {
		showSettledModal("Bob", "Alice");
		expect(document.querySelector("#modal-msg")!.innerHTML).toContain("paid");
		expect((document.querySelector("#modal-settle-btn") as HTMLButtonElement).style.display).toBe("none");
		expect((document.querySelector("#meme-modal") as HTMLElement).hidden).toBe(false);
	});
});
