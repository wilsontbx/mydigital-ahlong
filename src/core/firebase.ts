import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, remove, onValue, off, type DatabaseReference } from "firebase/database";
import type { GroupState } from "./types";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
	databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
	appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

function isConfigured(): boolean {
	return !!(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId);
}

let db: ReturnType<typeof getDatabase> | null = null;

function getDb() {
	if (!db) {
		const app = initializeApp(firebaseConfig);
		db = getDatabase(app);
	}
	return db;
}

function isValidGroup(data: unknown): data is GroupState {
	if (!data || typeof data !== "object") return false;
	const d = data as Record<string, unknown>;
	if (!d.id || !d.name) return false;
	// Firebase drops empty arrays — treat missing as empty
	if (!d.members) d.members = [];
	if (!d.expenses) d.expenses = [];
	// Firebase may convert arrays to objects — normalize
	if (!Array.isArray(d.members)) d.members = Object.values(d.members as object);
	if (!Array.isArray(d.expenses)) d.expenses = Object.values(d.expenses as object);
	return true;
}

// --- Fetch a group (one-shot read) ---

export async function fetchGroup(groupId: string): Promise<GroupState | null> {
	if (!isConfigured() || !groupId) return null;
	try {
		const snapshot = await get(ref(getDb(), `groups/${groupId}`));
		const data = snapshot.val();
		if (!isValidGroup(data)) return null;
		return data;
	} catch {
		return null;
	}
}

// --- Sanitize state for Firebase (strip undefined values) ---

function sanitize<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

// --- Sync a group to Firebase ---

export function syncGroupToFirebase(state: GroupState): void {
	if (!isConfigured() || !state.id) return;
	const groupRef = ref(getDb(), `groups/${state.id}`);
	set(groupRef, sanitize(state)).catch((err) => {
		console.error("[Firebase] sync failed:", err);
	});
}

export async function syncGroupToFirebaseAsync(state: GroupState): Promise<boolean> {
	if (!isConfigured() || !state.id) return false;
	try {
		const groupRef = ref(getDb(), `groups/${state.id}`);
		await set(groupRef, sanitize(state));
		return true;
	} catch (err) {
		console.error("[Firebase] sync failed:", err);
		return false;
	}
}

// --- Delete a group from Firebase ---

export async function deleteGroup(groupId: string): Promise<void> {
	if (!isConfigured() || !groupId) return;
	try {
		await remove(ref(getDb(), `groups/${groupId}`));
	} catch {}
}

// --- Listen for real-time updates on a group ---

let activeRef: DatabaseReference | null = null;

export function listenToGroup(groupId: string, onUpdate: (state: GroupState) => void): void {
	if (!isConfigured() || !groupId) return;
	stopListening();
	activeRef = ref(getDb(), `groups/${groupId}`);
	onValue(activeRef, (snapshot) => {
		const data = snapshot.val();
		if (isValidGroup(data)) {
			onUpdate(data);
		}
	});
}

export function stopListening(): void {
	if (activeRef) {
		off(activeRef);
		activeRef = null;
	}
}

export function isFirebaseEnabled(): boolean {
	return isConfigured();
}
