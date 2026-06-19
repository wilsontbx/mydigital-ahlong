import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock matchMedia before any imports that use it
Object.defineProperty(window, "matchMedia", {
	value: vi.fn(() => ({ matches: false })),
	configurable: true,
});

vi.mock("./core/state", () => ({
	loadState: vi.fn(() => ({ id: "test", name: "Boot", members: [], expenses: [] })),
	groupJustImported: false,
	decodeState: vi.fn(),
	loadGroups: vi.fn(() => []),
	saveGroups: vi.fn(),
	setActiveIndex: vi.fn(),
}));

vi.mock("./ui/render", () => ({
	render: vi.fn(),
	renderLanding: vi.fn(),
}));

vi.mock("./ui/events", () => ({
	setupEvents: vi.fn(),
}));

vi.mock("./ui/install", () => ({
	setupInstallPrompt: vi.fn(),
}));

vi.mock("./shared/utils", () => ({
	showToast: vi.fn(),
}));

import { loadState } from "./core/state";
import { render } from "./ui/render";
import { setupEvents } from "./ui/events";

describe("app bootstrap", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("loads state, sets up events, and renders (landing page shown via render when no groups)", async () => {
		vi.resetModules();
		await import("./app");

		expect(loadState).toHaveBeenCalledTimes(1);
		expect(setupEvents).toHaveBeenCalledTimes(1);
		expect(render).toHaveBeenCalledWith({ id: "test", name: "Boot", members: [], expenses: [] });

		const getState = (setupEvents as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as () => {
			name: string;
			members: string[];
			expenses: unknown[];
		};
		const setState = (setupEvents as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as (s: { name: string; members: string[]; expenses: unknown[] }) => void;
		setState({ name: "Changed", members: ["A"], expenses: [] });
		expect(getState()).toEqual({ name: "Changed", members: ["A"], expenses: [] });
	});
});
