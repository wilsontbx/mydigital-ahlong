import type { Currency, GroupState, Member } from "./types";

// --- Currencies ---

export const CURRENCIES: Currency[] = [
	{ code: "MYR", symbol: "RM" },
	{ code: "SGD", symbol: "S$" },
	{ code: "USD", symbol: "$" },
	{ code: "CAD", symbol: "C$" },
	{ code: "EUR", symbol: "€" },
	{ code: "GBP", symbol: "£" },
	{ code: "THB", symbol: "฿" },
	{ code: "JPY", symbol: "¥" },
	{ code: "KRW", symbol: "₩" },
	{ code: "IDR", symbol: "Rp" },
	{ code: "AUD", symbol: "A$" },
];

// --- Group names ---

const GROUP_NAMES: string[] = [
	"The Broke Bunch",
	"Hutang FC",
	"Debt Avengers",
	"Pay Me La",
	"Kaki Split",
	"The Owing League",
	"Makan Gang 🍜",
	"Belanja Society",
	"Budget Airlines",
	"No Money No Honey",
	"Kiam Siap Club",
	"Interest-Free Zone",
	"The Tab Splitters",
	"Confirm Plus Chop",
	"Last to Pay Drinks",
	"Potong Stim Inc.",
	"Settlekan Syndicate",
	"Cash Me Outside",
	"Receipt Warriors",
	"Trust Issues LLC",
];

export function randomGroupName(): string {
	return GROUP_NAMES[Math.floor(Math.random() * GROUP_NAMES.length)];
}

// --- Avatars ---

export const AVATAR_OPTIONS: string[] = [
	"😀", "😎", "🤓", "🥸", "🤡", "🤑", "🤮", "🥴", "🤠", "🥶", "🫠",
	"👻", "💀", "🤖", "👽", "👹", "🧟", "🧙", "🧛", "🥷", "🦸", "🦹",
	"🦊", "🐱", "🐶", "🐸", "🦁", "🐯", "🐻", "🐼", "🐨", "🐵", "🦄", "🐲", "🐷", "🐔", "🦧", "🐢", "🦀", "🐙", "🦈", "🐝",
	"👑", "🎃", "🌚", "💩", "🔥", "💎", "🧠", "👁️", "🍕", "🍜", "☠️", "🛸", "🌶️", "💸",
];

// --- ID generation ---

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- Create empty state ---

export function createEmptyState(name?: string): GroupState {
	const now = Date.now();
	return {
		id: generateId(),
		name: name || randomGroupName(),
		members: [],
		expenses: [],
		createdAt: now,
		updatedAt: now,
	};
}

// --- localStorage keys ---

const MY_GROUPS_KEY = "mydigital-ahlong_my_groups";
const ACTIVE_GROUP_KEY = "mydigital-ahlong_active_group";
const CACHE_PREFIX = "mydigital-ahlong_cache_";

// --- My group IDs ---

export function getMyGroupIds(): string[] {
	try {
		const raw = localStorage.getItem(MY_GROUPS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function addMyGroupId(id: string): void {
	const ids = getMyGroupIds();
	if (!ids.includes(id)) {
		ids.push(id);
		localStorage.setItem(MY_GROUPS_KEY, JSON.stringify(ids));
	}
}

export function removeMyGroupId(id: string): void {
	const ids = getMyGroupIds().filter((gid) => gid !== id);
	localStorage.setItem(MY_GROUPS_KEY, JSON.stringify(ids));
}

// --- Active group ---

export function getActiveGroupId(): string | null {
	return localStorage.getItem(ACTIVE_GROUP_KEY) || null;
}

export function setActiveGroupId(id: string): void {
	localStorage.setItem(ACTIVE_GROUP_KEY, id);
}

export function clearActiveGroupId(): void {
	localStorage.removeItem(ACTIVE_GROUP_KEY);
}

// --- Group cache (offline fallback) ---

export function cacheGroup(state: GroupState): void {
	localStorage.setItem(CACHE_PREFIX + state.id, JSON.stringify(state));
}

export function getCachedGroup(id: string): GroupState | null {
	try {
		const raw = localStorage.getItem(CACHE_PREFIX + id);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function removeCachedGroup(id: string): void {
	localStorage.removeItem(CACHE_PREFIX + id);
}

// --- Merge logic ---

export function mergeGroupStates(local: GroupState, remote: GroupState): GroupState {
	// Merge members by id — per-member updatedAt wins
	const memberMap = new Map<string, Member>();
	for (const m of local.members) {
		memberMap.set(m.id, { ...m });
	}
	for (const m of remote.members) {
		const existing = memberMap.get(m.id);
		if (existing) {
			if (m.updatedAt >= existing.updatedAt) {
				memberMap.set(m.id, { ...m });
			}
		} else {
			memberMap.set(m.id, { ...m });
		}
	}

	// Merge expenses by id — per-expense updatedAt wins
	const expenseMap = new Map(local.expenses.map((e) => [e.id, e]));

	for (const e of remote.expenses) {
		const existing = expenseMap.get(e.id);
		if (existing) {
			if (e.updatedAt >= existing.updatedAt) {
				expenseMap.set(e.id, e);
			}
		} else {
			expenseMap.set(e.id, e);
		}
	}

	const newerGroup = remote.updatedAt >= local.updatedAt ? remote : local;

	return {
		id: local.id,
		name: newerGroup.name,
		members: [...memberMap.values()],
		expenses: [...expenseMap.values()],
		createdAt: Math.min(local.createdAt, remote.createdAt),
		updatedAt: Math.max(remote.updatedAt, local.updatedAt),
	};
}
