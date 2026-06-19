import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, off, type DatabaseReference } from "firebase/database";
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

// --- Sync a group to Firebase ---

export function syncGroupToFirebase(state: GroupState): void {
	if (!isConfigured() || !state.id) return;
	const groupRef = ref(getDb(), `groups/${state.id}`);
	set(groupRef, state).catch(() => {
		// Silent fail — offline or misconfigured; localStorage still works
	});
}

// --- Listen for real-time updates on a group ---

let activeRef: DatabaseReference | null = null;

export function listenToGroup(groupId: string, onUpdate: (state: GroupState) => void): void {
	if (!isConfigured() || !groupId) return;

	// Unsubscribe previous listener
	stopListening();

	activeRef = ref(getDb(), `groups/${groupId}`);
	onValue(activeRef, (snapshot) => {
		const data = snapshot.val();
		if (data && data.id && data.name && Array.isArray(data.members) && Array.isArray(data.expenses)) {
			onUpdate(data as GroupState);
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
