import type { GroupState } from "./types";
import { loadGroups, saveGroups, getActiveIndex, setActiveIndex } from "./state";
import { syncGroupToFirebase, listenToGroup, stopListening, isFirebaseEnabled } from "./firebase";
import { showToast } from "../shared/utils";

let onRemoteState: ((s: GroupState) => void) | null = null;
let localUpdatedAt = 0;

// --- Merge: combine records from two copies of the same group ---

function mergeGroups(local: GroupState, remote: GroupState): GroupState {
	const localExpenseIds = new Set(local.expenses.map((e) => e.id));
	const remoteExpenseIds = new Set(remote.expenses.map((e) => e.id));

	// Start with local expenses, update any that exist in both (remote wins for shared IDs)
	const merged = local.expenses.map((e) => {
		if (remoteExpenseIds.has(e.id)) {
			return remote.expenses.find((r) => r.id === e.id)!;
		}
		return e;
	});

	// Add expenses only in remote
	for (const e of remote.expenses) {
		if (!localExpenseIds.has(e.id)) {
			merged.push(e);
		}
	}

	// Merge members (union of both)
	const memberSet = new Set([...local.members, ...remote.members]);

	return {
		id: local.id,
		name: remote.updatedAt >= (local.updatedAt || 0) ? remote.name : local.name,
		members: [...memberSet],
		expenses: merged,
		updatedAt: Math.max(remote.updatedAt || 0, local.updatedAt || 0),
	};
}

export function initSync(setter: (s: GroupState) => void): void {
	onRemoteState = setter;
}

// --- Debounced Firebase write ---

let firebaseTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedFirebaseWrite(state: GroupState): void {
	if (!isFirebaseEnabled()) return;
	if (firebaseTimer) clearTimeout(firebaseTimer);
	firebaseTimer = setTimeout(() => {
		syncGroupToFirebase(state);
		firebaseTimer = null;
	}, 500);
}

// --- commit: the single persist function ---

export function commit(state: GroupState): void {
	state.updatedAt = Date.now();
	localUpdatedAt = state.updatedAt;

	const groups = loadGroups();
	const idx = getActiveIndex();
	if (idx < groups.length) {
		groups[idx] = state;
	} else {
		groups.push(state);
	}
	saveGroups(groups);

	debouncedFirebaseWrite(state);
}

// --- importGroup: shared import utility ---

export function importGroup(imported: GroupState): GroupState {
	if (!imported.id) {
		imported.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	}
	if (!imported.updatedAt) {
		imported.updatedAt = Date.now();
	}

	const groups = loadGroups();
	const idIdx = groups.findIndex((g) => g.id === imported.id);

	if (idIdx !== -1) {
		const existing = groups[idIdx];
		const merged = mergeGroups(existing, imported);
		groups[idIdx] = merged;
		saveGroups(groups);
		setActiveIndex(idIdx);
		showToast(`Updated "${merged.name}" — synced & merged data 🔄`);
		localUpdatedAt = merged.updatedAt;
		return merged;
	} else {
		groups.push(imported);
		saveGroups(groups);
		setActiveIndex(groups.length - 1);
		showToast(`Group "${imported.name}" added! ✅`);
	}

	localUpdatedAt = imported.updatedAt;
	return imported;
}

// --- Firebase listener: single implementation ---

function handleRemoteUpdate(updated: GroupState): void {
	if (!updated.updatedAt) updated.updatedAt = 0;

	// Echo suppression: ignore if remote is not newer
	if (updated.updatedAt <= localUpdatedAt) return;

	const groups = loadGroups();
	const idx = getActiveIndex();
	if (groups[idx]?.id === updated.id) {
		const merged = mergeGroups(groups[idx], updated);
		localUpdatedAt = merged.updatedAt;
		groups[idx] = merged;
		saveGroups(groups);
		if (onRemoteState) onRemoteState(merged);
	}
}

export function subscribeToGroup(groupId: string): void {
	stopListening();
	if (!isFirebaseEnabled() || !groupId) return;
	listenToGroup(groupId, handleRemoteUpdate);
}

export function setLocalUpdatedAt(ts: number): void {
	localUpdatedAt = ts;
}
