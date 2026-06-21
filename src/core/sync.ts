import type { GroupState } from "./types";
import { cacheGroup, getCachedGroup, addMyGroupId, setActiveGroupId, mergeGroupStates } from "./state";
import { syncGroupToFirebase, syncGroupToFirebaseAsync, fetchGroup, listenToGroup, stopListening, isFirebaseEnabled } from "./firebase";
import { showToast } from "../shared/utils";

let onRemoteState: ((s: GroupState) => void) | null = null;
let localUpdatedAt = 0;

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

// --- commit: persist state ---

export function commit(state: GroupState): void {
	state.updatedAt = Date.now();
	localUpdatedAt = state.updatedAt;
	cacheGroup(state);
	debouncedFirebaseWrite(state);
}

// Force immediate write to Firebase (call before sharing, awaitable)
export async function flushToFirebase(state: GroupState): Promise<boolean> {
	if (!isFirebaseEnabled()) return false;
	if (firebaseTimer) {
		clearTimeout(firebaseTimer);
		firebaseTimer = null;
	}
	return syncGroupToFirebaseAsync(state);
}

// --- importGroup: join a group from a link ---

export interface ImportResult {
	state: GroupState;
	isNew: boolean;
}

export async function importGroup(groupId: string): Promise<ImportResult | null> {
	let remote = await fetchGroup(groupId);
	if (!remote) {
		await new Promise((r) => setTimeout(r, 1000));
		remote = await fetchGroup(groupId);
	}
	if (!remote) return null;

	const cached = getCachedGroup(groupId);
	const merged = cached ? mergeGroupStates(cached, remote) : remote;

	cacheGroup(merged);
	addMyGroupId(merged.id);
	setActiveGroupId(merged.id);
	localUpdatedAt = merged.updatedAt;

	if (cached) {
		showToast(`Synced "${merged.name}" 🔄`);
	} else {
		showToast(`Joined "${merged.name}" ✅`);
	}

	return { state: merged, isNew: !cached };
}

// --- Firebase listener ---

function handleRemoteUpdate(updated: GroupState): void {
	if (!updated.updatedAt) updated.updatedAt = 0;
	if (updated.updatedAt <= localUpdatedAt) return;

	const cached = getCachedGroup(updated.id);
	const merged = cached ? mergeGroupStates(cached, updated) : updated;

	localUpdatedAt = merged.updatedAt;
	cacheGroup(merged);
	if (onRemoteState) onRemoteState(merged);
}

export function subscribeToGroup(groupId: string): void {
	stopListening();
	if (!isFirebaseEnabled() || !groupId) return;
	listenToGroup(groupId, handleRemoteUpdate);
}

export function setLocalUpdatedAt(ts: number): void {
	localUpdatedAt = ts;
}
