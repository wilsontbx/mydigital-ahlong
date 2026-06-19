import { deflateSync, inflateSync, strToU8, strFromU8 } from "fflate";
import type { Currency, GroupState } from "./types";

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

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function createEmptyState(name?: string): GroupState {
	return {
		id: generateId(),
		name: name || randomGroupName(),
		members: [],
		expenses: [],
		updatedAt: Date.now(),
	};
}

// --- URL-safe base64 helpers ---

function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
	const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

// --- URL hash serialization ---

export function encodeState(state: GroupState): string {
	const json = JSON.stringify(state);
	const compressed = deflateSync(strToU8(json));
	return toBase64Url(compressed);
}

export function decodeState(hash: string): GroupState | null {
	if (!hash) return null;
	try {
		const compressed = fromBase64Url(hash);
		const json = strFromU8(inflateSync(compressed));
		return JSON.parse(json) as GroupState;
	} catch {
		return null;
	}
}

export function saveToHash(state: GroupState): void {
	const encoded = encodeState(state);
	window.history.replaceState(null, "", "#" + encoded);
}

export function loadFromHash(): GroupState | null {
	const hash = window.location.hash.slice(1);
	return decodeState(hash);
}

// --- LocalStorage keys ---

const GROUPS_KEY = "mydigital-ahlong_groups";
const ACTIVE_KEY = "mydigital-ahlong_active";
const PAYMENT_KEY = "mydigital-ahlong_payments";
const AVATARS_KEY = "mydigital-ahlong_avatars";

// --- Avatars ---

export const AVATAR_OPTIONS: string[] = [
	// Faces
	"😀",
	"😎",
	"🤓",
	"🥸",
	"🤡",
	"🤑",
	"🤮",
	"🥴",
	"🤠",
	"🥶",
	"🫠",
	// Spooky & fantasy
	"👻",
	"💀",
	"🤖",
	"👽",
	"👹",
	"🧟",
	"🧙",
	"🧛",
	"🥷",
	"🦸",
	"🦹",
	// Animals
	"🦊",
	"🐱",
	"🐶",
	"🐸",
	"🦁",
	"🐯",
	"🐻",
	"🐼",
	"🐨",
	"🐵",
	"🦄",
	"🐲",
	"🐷",
	"🐔",
	"🦧",
	"🐢",
	"🦀",
	"🐙",
	"🦈",
	"🐝",
	// Objects & symbols
	"👑",
	"🎃",
	"🌚",
	"💩",
	"🔥",
	"💎",
	"🧠",
	"👁️",
	"🍕",
	"🍜",
	"☠️",
	"🛸",
	"🌶️",
	"💸",
];

export function loadAvatars(): Record<string, string> {
	try {
		const raw = localStorage.getItem(AVATARS_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

export function saveAvatars(avatars: Record<string, string>): void {
	localStorage.setItem(AVATARS_KEY, JSON.stringify(avatars));
}

// --- Payment Methods ---

export function loadPaymentMethods(): Record<string, string> {
	try {
		const raw = localStorage.getItem(PAYMENT_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

export function savePaymentMethods(methods: Record<string, string>): void {
	localStorage.setItem(PAYMENT_KEY, JSON.stringify(methods));
}

// --- Groups ---

export function loadGroups(): GroupState[] {
	try {
		const raw = localStorage.getItem(GROUPS_KEY);
		const groups: GroupState[] = raw ? JSON.parse(raw) : [];
		let migrated = false;
		for (const g of groups) {
			if (!g.id) {
				g.id = generateId();
				migrated = true;
			}
			if (!g.updatedAt) {
				g.updatedAt = Date.now();
				migrated = true;
			}
		}
		if (migrated) saveGroups(groups);
		return groups;
	} catch {
		return [];
	}
}

export function saveGroups(groups: GroupState[]): void {
	localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function getActiveIndex(): number {
	const idx = parseInt(localStorage.getItem(ACTIVE_KEY) || "", 10);
	return isNaN(idx) ? 0 : idx;
}

export function setActiveIndex(idx: number): void {
	localStorage.setItem(ACTIVE_KEY, String(idx));
}

// --- State loading ---

/** Set to true when a group was just imported from a shared link */
export let groupJustImported = false;

export function loadState(): GroupState {
	groupJustImported = false;
	const fromHash = loadFromHash();
	if (fromHash) {
		if (!fromHash.id) fromHash.id = generateId();
		if (!fromHash.updatedAt) fromHash.updatedAt = Date.now();

		const groups = loadGroups();
		const activeIdx = Math.min(getActiveIndex(), groups.length - 1);

		// Check if hash matches the currently active group (just a refresh)
		if (groups.length && groups[activeIdx]?.id === fromHash.id && JSON.stringify(groups[activeIdx]) === JSON.stringify(fromHash)) {
			return fromHash;
		}

		// Check if group with same id exists — update it with shared data
		const idIdx = groups.findIndex((g) => g.id === fromHash.id);
		if (idIdx !== -1) {
			groups[idIdx] = fromHash;
			saveGroups(groups);
			setActiveIndex(idIdx);
			window.history.replaceState(null, "", window.location.pathname);
			return fromHash;
		}

		// Import as new group (shared link)
		groups.push(fromHash);
		saveGroups(groups);
		setActiveIndex(groups.length - 1);
		window.history.replaceState(null, "", window.location.pathname);
		groupJustImported = true;
		return fromHash;
	}

	const groups = loadGroups();
	if (!groups.length) {
		return createEmptyState();
	}

	const idx = Math.min(getActiveIndex(), groups.length - 1);
	return groups[idx];
}

