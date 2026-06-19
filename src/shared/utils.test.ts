// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { esc, pickRandom, showToast } from "./utils";

describe("utils module", () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="toast"></div>';
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("esc escapes HTML-sensitive content", () => {
		const input = '<img src=x onerror="alert(1)">';
		const output = esc(input);

		expect(output).toBe('&lt;img src=x onerror="alert(1)"&gt;');
	});

	it("pickRandom returns one of the items in array", () => {
		const arr = ["a", "b", "c"];
		const value = pickRandom(arr);
		expect(arr).toContain(value);
	});

	it("showToast sets message and toggles show class", () => {
		vi.useFakeTimers();
		const toast = document.querySelector("#toast") as HTMLElement;

		showToast("Hello");
		expect(toast.textContent).toBe("Hello");
		expect(toast.classList.contains("show")).toBe(true);

		vi.advanceTimersByTime(2500);
		expect(toast.classList.contains("show")).toBe(false);
	});
});
