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

let _testId = 0;
function makeMember(name: string, overrides: Partial<Member> = {}): Member {
	return { id: `test-${_testId++}`, name, payment: "", avatar: "😀", updatedAt: 1000, ...overrides };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
	return {
		id: "e1",
		type: "expense",
		desc: "Test",
		amount: 10,
		paidBy: "m-alice",
		splitAmong: ["m-alice", "m-bob"],
		splitType: "equal",
		currency: "MYR",
		date: 1000,
		createdAt: 1000,
		updatedAt: 1000,
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

		it("remote wins for same expense ID when remote updatedAt is newer", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", desc: "Old", updatedAt: 1000 })],
				createdAt: 1000,
				updatedAt: 2000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", desc: "New", updatedAt: 2000 })],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.expenses).toHaveLength(1);
			expect(merged.expenses[0].desc).toBe("New");
		});

		it("local wins for same expense ID when local updatedAt is newer", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", desc: "Local edit", updatedAt: 3000 })],
				createdAt: 1000,
				updatedAt: 3000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", desc: "Remote edit", updatedAt: 2000 })],
				createdAt: 1000,
				updatedAt: 2000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.expenses).toHaveLength(1);
			expect(merged.expenses[0].desc).toBe("Local edit");
		});

		it("deleted expense stays deleted when delete is newer", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", deleted: true, updatedAt: 3000 })],
				createdAt: 1000,
				updatedAt: 3000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", deleted: false, desc: "Edited", updatedAt: 2000 })],
				createdAt: 1000,
				updatedAt: 2000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.expenses).toHaveLength(1);
			expect(merged.expenses[0].deleted).toBe(true);
		});

		it("deleted expense can be overridden by newer remote edit", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", deleted: true, updatedAt: 2000 })],
				createdAt: 1000,
				updatedAt: 2000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice")],
				expenses: [makeExpense({ id: "e1", deleted: false, desc: "Newer edit", updatedAt: 3000 })],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.expenses).toHaveLength(1);
			expect(merged.expenses[0].deleted).toBe(false);
			expect(merged.expenses[0].desc).toBe("Newer edit");
		});

		it("merges members by id using per-member updatedAt", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice", { id: "m1", payment: "old-pay", avatar: "🐱", updatedAt: 2000 })],
				expenses: [],
				createdAt: 1000,
				updatedAt: 2000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice", { id: "m1", payment: "new-pay", avatar: "🦊", updatedAt: 3000 })],
				expenses: [],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.members).toHaveLength(1);
			expect(merged.members[0].payment).toBe("new-pay");
			expect(merged.members[0].avatar).toBe("🦊");
		});

		it("local member wins when local updatedAt is newer", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice", { id: "m1", payment: "local-pay", updatedAt: 5000 })],
				expenses: [],
				createdAt: 1000,
				updatedAt: 5000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice", { id: "m1", payment: "remote-pay", updatedAt: 3000 })],
				expenses: [],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.members).toHaveLength(1);
			expect(merged.members[0].payment).toBe("local-pay");
		});

		it("concurrent edits to different members both survive", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [
					makeMember("Alice", { id: "m1", payment: "alice-local", updatedAt: 3000 }),
					makeMember("Bob", { id: "m2", payment: "bob-old", updatedAt: 1000 }),
				],
				expenses: [],
				createdAt: 1000,
				updatedAt: 3000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [
					makeMember("Alice", { id: "m1", payment: "alice-old", updatedAt: 1000 }),
					makeMember("Bob", { id: "m2", payment: "bob-remote", updatedAt: 3000 }),
				],
				expenses: [],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.members).toHaveLength(2);
			const alice = merged.members.find((m) => m.id === "m1")!;
			const bob = merged.members.find((m) => m.id === "m2")!;
			expect(alice.payment).toBe("alice-local");
			expect(bob.payment).toBe("bob-remote");
		});

		it("rename on remote does not duplicate member when merged by id", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Alice", { id: "m1", updatedAt: 1000 })],
				expenses: [],
				createdAt: 1000,
				updatedAt: 2000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [makeMember("Bob", { id: "m1", updatedAt: 2000 })],
				expenses: [],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			expect(merged.members).toHaveLength(1);
			expect(merged.members[0].name).toBe("Bob");
			expect(merged.members[0].id).toBe("m1");
		});

		it("handles legacy members without updatedAt (defaults to 0)", () => {
			const local: GroupState = {
				id: "g1",
				name: "G",
				members: [{ id: "m1", name: "Alice", payment: "", avatar: "😀", updatedAt: 0 } as Member],
				expenses: [],
				createdAt: 1000,
				updatedAt: 2000,
			};
			const remote: GroupState = {
				id: "g1",
				name: "G",
				members: [{ id: "m1", name: "Alice", payment: "new", avatar: "🦊", updatedAt: 0 } as Member],
				expenses: [],
				createdAt: 1000,
				updatedAt: 3000,
			};

			const merged = mergeGroupStates(local, remote);

			// When both have updatedAt=0, remote wins (>= comparison)
			expect(merged.members[0].payment).toBe("new");
		});
	});
});
