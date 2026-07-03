import type { GroupState } from "./types";
import { cacheGroup, getCachedGroup, addMyGroupId, setActiveGroupId, mergeGroupStates } from "./state";
import { syncGroupToFirebase, syncGroupToFirebaseAsync, fetchGroup, listenToGroup, stopListening, isFirebaseEnabled } from "./firebase";
import { showToast } from "../shared/utils";

let onRemoteState: ((s: GroupState) => void) | null = null;

export function initSync(setter: (s: GroupState) => void): void {
	onRemoteState = setter;
}

// --- Debounced Firebase write with pending-state tracking ---

let firebaseTimer: ReturnType<typeof setTimeout> | null = null;
let pendingGroupId: string | null = null;

function debouncedFirebaseWrite(state: GroupState): void {
	if (!isFirebaseEnabled()) return;
	pendingGroupId = state.id;
	if (firebaseTimer) clearTimeout(firebaseTimer);
	firebaseTimer = setTimeout(() => {
		const latest = getCachedGroup(pendingGroupId!);
		if (latest) syncGroupToFirebase(latest);
		pendingGroupId = null;
		firebaseTimer = null;
	}, 500);
}

// Flush any pending debounced write immediately (call on visibilitychange/beforeunload)
export function flushPendingWrites(): void {
	if (firebaseTimer && pendingGroupId) {
		clearTimeout(firebaseTimer);
		firebaseTimer = null;
		const latest = getCachedGroup(pendingGroupId);
		if (latest) syncGroupToFirebase(latest);
		pendingGroupId = null;
	}
}

// --- commit: persist state locally + schedule Firebase write ---

export function commit(state: GroupState): void {
	state.updatedAt = Date.now();
	cacheGroup(state);
	debouncedFirebaseWrite(state);
}

// Force immediate write to Firebase (call before sharing, awaitable)
export async function flushToFirebase(state: GroupState): Promise<boolean> {
	if (!isFirebaseEnabled()) return false;
	if (firebaseTimer) {
		clearTimeout(firebaseTimer);
		firebaseTimer = null;
		pendingGroupId = null;
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

	const isNew = !getCachedGroup(groupId);
	// Firebase is source of truth — use remote directly
	cacheGroup(remote);
	addMyGroupId(remote.id);
	setActiveGroupId(remote.id);

	if (!isNew) {
		showToast(`Synced "${remote.name}" 🔄`);
	} else {
		showToast(`Joined "${remote.name}" ✅`);
	}

	return { state: remote, isNew };
}

// --- Firebase listener: Firebase is source of truth ---

function handleRemoteUpdate(updated: GroupState): void {
	if (pendingGroupId === updated.id) {
		// A local write is in-flight — the cache holds the latest local state
		// (including unsaved changes). Merge so concurrent remote changes are
		// preserved too, but local (cached) changes take priority.
		const cached = getCachedGroup(updated.id);
		if (cached) {
			const merged = mergeGroupStates(updated, cached);
			cacheGroup(merged);
			if (onRemoteState) onRemoteState(merged);
			return;
		}
	}
	// No pending local write — Firebase is the source of truth
	cacheGroup(updated);
	if (onRemoteState) onRemoteState(updated);
}

export function subscribeToGroup(groupId: string): void {
	stopListening();
	if (!isFirebaseEnabled() || !groupId) return;
	listenToGroup(groupId, handleRemoteUpdate);
}
