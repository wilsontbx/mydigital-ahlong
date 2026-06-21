// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
	createEmptyState,
	randomGroupName,
	CURRENCIES,
	AVATAR_OPTIONS,
	getMyGroupIds,
	addMyGroupId,
	removeMyGroupId,
	getActiveGroupId,
	setActiveGroupId,
	cacheGroup,
	getCachedGroup,
	removeCachedGroup,
	mergeGroupStates,
} from "./state";
import type { GroupState, Member, Expense } from "./types";

function makeMember(name: string, payment = "", avatar = "😀"): Member {
	return { name, payment, avatar };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
	return {
		id: "e1",
		desc: "Test",
		amount: 10,
		paidBy: "Alice",
		splitAmong: ["Alice", "Bob"],
		currency: "MYR",
		createdAt: 1000,
		deleted: false,
		...overrides,
	};
}

beforeEach(() => {
	localStorage.clear();
});

describe("state module", () => {
	it("CURRENCIES has expected entries", () => {
		expect(CURRENCIES.length).toBeGreaterThan(5);
		expect(CURRENCIES[0].code).toBe("MYR");
	});

	it("AVATAR_OPTIONS is non-empty", () => {
		expect(AVATAR_OPTIONS.length).toBeGreaterThan(10);
	});

	it("randomGroupName returns a string", () => {
		expect(typeof randomGroupName()).toBe("string");
	});

	it("createEmptyState creates valid group with id and timestamps", () => {
		const state = createEmptyState("Test");
		expect(state.name).toBe("Test");
		expect(state.id).toBeTruthy();
		expect(state.members).toEqual([]);
		expect(state.expenses).toEqual([]);
		expect(state.createdAt).toBeGreaterThan(0);
		expect(state.updatedAt).toBeGreaterThan(0);
	});

	it("createEmptyState uses random name when none provided", () => {
		const state = createEmptyState();
		expect(state.name.length).toBeGreaterThan(0);
	});

	describe("my group IDs", () => {
		it("starts empty", () => {
			expect(getMyGroupIds()).toEqual([]);
		});

		it("addMyGroupId adds unique IDs", () => {
			addMyGroupId("a");
			addMyGroupId("b");
			addMyGroupId("a");
			expect(getMyGroupIds()).toEqual(["a", "b"]);
		});

		it("removeMyGroupId removes by ID", () => {
			addMyGroupId("a");
			addMyGroupId("b");
			removeMyGroupId("a");
			expect(getMyGroupIds()).toEqual(["b"]);
		});
	});

	describe("active group", () => {
		it("returns null initially", () => {
			expect(getActiveGroupId()).toBeNull();
		});

		it("set and get active group", () => {
			setActiveGroupId("abc123");
			expect(getActiveGroupId()).toBe("abc123");
		});
	});

	describe("group cache", () => {
		it("cacheGroup and getCachedGroup round-trip", () => {
			const state = createEmptyState("Cached");
			cacheGroup(state);
			const loaded = getCachedGroup(state.id);
			expect(loaded).toEqual(state);
		});

		it("getCachedGroup returns null for unknown ID", () => {
			expect(getCachedGroup("nope")).toBeNull();
		});

		it("removeCachedGroup removes the cache", () => {
			const state = createEmptyState("ToRemove");
			cacheGroup(state);
			removeCachedGroup(state.id);
			expect(getCachedGroup(state.id)).toBeNull();
		});
	});

	describe("mergeGroupStates", () => {
		it("merges expenses from both sides by ID", () => {
			const local: GroupState = {
				id: "g1",
				name: "Local",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", desc: "Local expense" })],
				createdAt: 1000,
				updatedAt: 2000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "Remote",
				members: [makeMember("Bob")],
				expenses: [makeExpense({ id: "e2", desc: "Remote expense" })],
				createdAt: 900,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.expenses).toHaveLength(2);
			expect(merged.members).toHaveLength(2);
			expect(merged.name).toBe("Remote");
			expect(merged.updatedAt).toBe(3000);
			expect(merged.createdAt).toBe(900);
		});

		it("remote wins for same expense ID when newer", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", desc: "Old", createdAt: 1000 })],
				createdAt: 1000,
				updatedAt: 2000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", desc: "New", createdAt: 2000 })],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.expenses).toHaveLength(1);
			expect(merged.expenses[0].desc).toBe("New");
		});

		it("merges members by name, remote wins when newer", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice", "old-pay", "🐱")],
				expenses: [],
				createdAt: 1000,
				updatedAt: 2000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice", "new-pay", "🦊")],
				expenses: [],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.members).toHaveLength(1);
			expect(merged.members[0].payment).toBe("new-pay");
			expect(merged.members[0].avatar).toBe("🦊");
		});
	});
});
