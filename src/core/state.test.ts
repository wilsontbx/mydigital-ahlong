// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
	encodeState,
	decodeState,
	randomGroupName,
	createEmptyState,
	loadAvatars,
	saveAvatars,
	loadPaymentMethods,
	savePaymentMethods,
	loadGroups,
	saveGroups,
	getActiveIndex,
	setActiveIndex,
	saveToHash,
	loadFromHash,
	loadState,
} from "./state";
import type { GroupState } from "./types";

function makeState(name = "Trip Group", id = name): GroupState {
	return {
		id,
		name,
		members: ["Alice", "Bob"],
		expenses: [
			{
				id: "1",
				desc: "Lunch",
				amount: 25.5,
				paidBy: "Alice",
				splitAmong: ["Alice", "Bob"],
				currency: "MYR",
				addedBy: "Alice",
				date: "2026-06-11",
				time: "12:00",
			},
		],
		updatedAt: Date.now(),
	};
}

beforeEach(() => {
	localStorage.clear();
	window.history.replaceState(null, "", "/");
});

describe("state serialization", () => {
	it("encodeState + decodeState round-trips valid state", () => {
		const state = makeState();

		const encoded = encodeState(state);
		const decoded = decodeState(encoded);

		expect(decoded).toEqual(state);
	});

	it("decodeState returns null for invalid input", () => {
		expect(decodeState("this-is-not-valid-compressed-data")).toBeNull();
	});

	it("decodeState returns null for empty input", () => {
		expect(decodeState("")).toBeNull();
	});

	it("saveToHash and loadFromHash work together", () => {
		const state = makeState("Hash Group");

		saveToHash(state);
		const loaded = loadFromHash();

		expect(window.location.hash.length).toBeGreaterThan(1);
		expect(loaded).toEqual(state);
	});
});

describe("local storage helpers", () => {
	it("save/load avatars", () => {
		saveAvatars({ Alice: "😎" });
		expect(loadAvatars()).toEqual({ Alice: "😎" });
	});

	it("save/load payment methods", () => {
		savePaymentMethods({ Alice: "DuitNow 012" });
		expect(loadPaymentMethods()).toEqual({ Alice: "DuitNow 012" });
	});

	it("save/load groups and active index", () => {
		const groups = [makeState("A"), makeState("B")];
		saveGroups(groups);
		setActiveIndex(1);

		expect(loadGroups()).toEqual(groups);
		expect(getActiveIndex()).toBe(1);
	});

	it("loadGroups migrates groups without id or updatedAt", () => {
		const rawGroups = [{ name: "Old Group", members: ["A"], expenses: [] }];
		localStorage.setItem("mydigital-ahlong_groups", JSON.stringify(rawGroups));

		const groups = loadGroups();

		expect(groups[0].id).toBeTruthy();
		expect(groups[0].updatedAt).toBeGreaterThan(0);
		// Should persist the migration
		const saved = JSON.parse(localStorage.getItem("mydigital-ahlong_groups")!);
		expect(saved[0].id).toBeTruthy();
	});

	it("returns safe defaults when storage has invalid JSON", () => {
		localStorage.setItem("mydigital-ahlong_groups", "{invalid");
		localStorage.setItem("mydigital-ahlong_payments", "{invalid");
		localStorage.setItem("mydigital-ahlong_avatars", "{invalid");

		expect(loadGroups()).toEqual([]);
		expect(loadPaymentMethods()).toEqual({});
		expect(loadAvatars()).toEqual({});
	});
});

describe("state loading and persistence", () => {
	it("loadState returns empty state without persisting when no stored data exists", () => {
		const loaded = loadState();

		expect(loaded.members).toEqual([]);
		expect(loaded.expenses).toEqual([]);
		expect(loadGroups()).toHaveLength(0);
	});

	it("loadState does not persist to localStorage when no groups exist", () => {
		loadState();

		// Should NOT auto-save a group to localStorage
		const raw = localStorage.getItem("mydigital-ahlong_groups");
		expect(raw === null || raw === "[]").toBe(true);
	});

	it("loadState returns empty state with a name even when no groups exist", () => {
		const loaded = loadState();

		expect(loaded.name).toBeTruthy();
		expect(loaded.members).toEqual([]);
		expect(loaded.expenses).toEqual([]);
	});

	it("loadState returns stored active group when no hash exists", () => {
		saveGroups([makeState("A"), makeState("B")]);
		setActiveIndex(1);

		const loaded = loadState();
		expect(loaded.name).toBe("B");
	});

	it("loadState clamps out-of-range active index", () => {
		saveGroups([makeState("Only")]);
		setActiveIndex(9);

		const loaded = loadState();
		expect(loaded.name).toBe("Only");
	});

	it("loadState imports hash as new group when not found", () => {
		saveGroups([makeState("Stored")]);
		setActiveIndex(0);

		const shared = makeState("Shared");
		window.location.hash = `#${encodeState(shared)}`;

		const loaded = loadState();
		expect(loaded.name).toBe("Shared");
		expect(loadGroups()).toHaveLength(2);
		expect(getActiveIndex()).toBe(1);
		expect(window.location.hash).toBe("");
	});

	it("loadState reuses existing group when hash matches existing data", () => {
		const a = makeState("A");
		const b = makeState("B");
		saveGroups([a, b]);
		setActiveIndex(0);
		window.location.hash = `#${encodeState(b)}`;

		const loaded = loadState();
		expect(loaded.name).toBe("B");
		expect(loadGroups()).toHaveLength(2);
		expect(getActiveIndex()).toBe(1);
		expect(window.location.hash).toBe("");
	});

	it("loadState does not create duplicate group on page refresh", () => {
		const group = makeState("My Trip");
		saveGroups([group]);
		setActiveIndex(0);
		// Simulate refresh: hash contains the same active group data
		window.location.hash = `#${encodeState(group)}`;

		const loaded = loadState();
		expect(loaded.name).toBe("My Trip");
		expect(loadGroups()).toHaveLength(1);
		expect(getActiveIndex()).toBe(0);
	});

	it("loadState does not create duplicate group when re-entering same URL", () => {
		const a = makeState("A");
		const b = makeState("B");
		saveGroups([a, b]);
		setActiveIndex(1);
		// Simulate re-entering URL with group B's encoded state
		window.location.hash = `#${encodeState(b)}`;

		const loaded = loadState();
		expect(loaded.name).toBe("B");
		expect(loadGroups()).toHaveLength(2);
		expect(getActiveIndex()).toBe(1);
	});

	it("commit updates current active group in localStorage", async () => {
		const { commit } = await import("./sync");
		saveGroups([makeState("A"), makeState("B")]);
		setActiveIndex(1);
		const updated = makeState("Updated B");

		commit(updated);

		expect(loadGroups()[1].name).toBe("Updated B");
		expect(updated.updatedAt).toBeGreaterThan(0);
	});
});

describe("small helpers", () => {
	it("randomGroupName returns a non-empty string", () => {
		expect(randomGroupName().length).toBeGreaterThan(0);
	});

	it("createEmptyState uses provided name", () => {
		expect(createEmptyState("Custom").name).toBe("Custom");
	});

	it("createEmptyState falls back to random name", () => {
		const state = createEmptyState();
		expect(state.name.length).toBeGreaterThan(0);
		expect(state.members).toEqual([]);
		expect(state.expenses).toEqual([]);
	});
});
