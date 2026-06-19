import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupInstallPrompt, trackExpenseForInstall } from "./install";

vi.mock("./dialogs", () => ({
	showDialog: vi.fn(),
}));

import { showDialog } from "./dialogs";

function setupDom() {
	document.body.innerHTML = `
		<div id="install-banner">
			<button id="install-btn"></button>
			<button id="install-dismiss"></button>
		</div>
		<div id="install-modal" hidden>
			<button id="install-modal-yes"></button>
			<button id="install-modal-nah"></button>
		</div>
		<div id="toast"></div>
	`;
}

describe("setupInstallPrompt", () => {
	beforeEach(() => {
		setupDom();
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("hides banner if already in standalone mode", () => {
		Object.defineProperty(window, "matchMedia", {
			value: vi.fn(() => ({ matches: true })),
			configurable: true,
		});
		setupInstallPrompt();
		expect((document.querySelector("#install-banner") as HTMLElement).hidden).toBe(true);
	});

	it("keeps banner visible when not standalone", () => {
		Object.defineProperty(window, "matchMedia", {
			value: vi.fn(() => ({ matches: false })),
			configurable: true,
		});
		setupInstallPrompt();
		expect((document.querySelector("#install-banner") as HTMLElement).hidden).toBe(false);
	});

	it("install button calls prompt and hides banner on accept", async () => {
		Object.defineProperty(window, "matchMedia", {
			value: vi.fn(() => ({ matches: false })),
			configurable: true,
		});
		setupInstallPrompt();

		const promptFn = vi.fn();
		const event = new Event("beforeinstallprompt", { cancelable: true });
		Object.defineProperty(event, "prompt", { value: promptFn });
		Object.defineProperty(event, "userChoice", {
			value: Promise.resolve({ outcome: "accepted" }),
		});
		window.dispatchEvent(event);

		(document.querySelector("#install-btn") as HTMLButtonElement).click();
		await new Promise((r) => setTimeout(r, 0));

		expect(promptFn).toHaveBeenCalled();
		expect((document.querySelector("#install-banner") as HTMLElement).hidden).toBe(true);
	});
});

describe("trackExpenseForInstall", () => {
	beforeEach(() => {
		setupDom();
		localStorage.clear();
		vi.clearAllMocks();
		Object.defineProperty(window, "matchMedia", {
			value: vi.fn(() => ({ matches: false })),
			configurable: true,
		});
	});

	it("does not show modal before threshold (3 expenses)", () => {
		trackExpenseForInstall();
		trackExpenseForInstall();
		expect(showDialog).not.toHaveBeenCalled();
	});

	it("shows install modal after 3 expenses", () => {
		trackExpenseForInstall();
		trackExpenseForInstall();
		trackExpenseForInstall();
		expect((document.querySelector("#install-modal") as HTMLElement).hidden).toBe(false);
	});

	it("does not show modal again after already prompted", () => {
		trackExpenseForInstall();
		trackExpenseForInstall();
		trackExpenseForInstall();
		vi.clearAllMocks();
		trackExpenseForInstall();
		expect(showDialog).not.toHaveBeenCalled();
	});

	it("does not track if already standalone", () => {
		Object.defineProperty(window, "matchMedia", {
			value: vi.fn(() => ({ matches: true })),
			configurable: true,
		});
		trackExpenseForInstall();
		trackExpenseForInstall();
		trackExpenseForInstall();
		expect(showDialog).not.toHaveBeenCalled();
	});
});
