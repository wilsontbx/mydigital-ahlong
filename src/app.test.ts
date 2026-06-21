import { describe, it, expect, vi, beforeEach } from "vitest";

Object.defineProperty(window, "matchMedia", {
	value: vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
	configurable: true,
});

vi.mock("./core/state", () => ({
	createEmptyState: vi.fn(() => ({ id: "new", name: "New", members: [], expenses: [], createdAt: 1, updatedAt: 1 })),
	getMyGroupIds: vi.fn(() => []),
	addMyGroupId: vi.fn(),
	removeMyGroupId: vi.fn(),
	getActiveGroupId: vi.fn(() => null),
	setActiveGroupId: vi.fn(),
	cacheGroup: vi.fn(),
	getCachedGroup: vi.fn(() => null),
	removeCachedGroup: vi.fn(),
	mergeGroupStates: vi.fn((_a, b) => b),
}));

vi.mock("./core/firebase", () => ({
	isFirebaseEnabled: vi.fn(() => false),
	fetchGroup: vi.fn(async () => null),
}));

vi.mock("./core/sync", () => ({
	initSync: vi.fn(),
	commit: vi.fn(),
	subscribeToGroup: vi.fn(),
	setLocalUpdatedAt: vi.fn(),
	importGroup: vi.fn(async () => null),
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

import { renderLanding } from "./ui/render";
import { setupEvents } from "./ui/events";

describe("app bootstrap", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("shows landing page when no groups exist", async () => {
		vi.resetModules();
		await import("./app");
		await new Promise((r) => setTimeout(r, 10));

		expect(renderLanding).toHaveBeenCalled();
		expect(setupEvents).toHaveBeenCalled();
	});
});
