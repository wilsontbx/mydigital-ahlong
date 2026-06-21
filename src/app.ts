import type { GroupState } from "./core/types";
import {
	createEmptyState,
	getMyGroupIds,
	addMyGroupId,
	getActiveGroupId,
	setActiveGroupId,
	cacheGroup,
	getCachedGroup,
	mergeGroupStates,
} from "./core/state";
import { render, renderLanding } from "./ui/render";
import { setupEvents } from "./ui/events";
import { setupInstallPrompt } from "./ui/install";
import { showToast } from "./shared/utils";
import { isFirebaseEnabled, fetchGroup } from "./core/firebase";
import { initSync, commit, subscribeToGroup, setLocalUpdatedAt, importGroup } from "./core/sync";

// --- Theme ---
const THEME_KEY = "mydigital-ahlong_theme";

function getEffectiveTheme(): "light" | "dark" {
	const saved = localStorage.getItem(THEME_KEY);
	if (saved === "light" || saved === "dark") return saved;
	return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: "light" | "dark") {
	document.documentElement.setAttribute("data-theme", theme);
	const btn = document.getElementById("theme-toggle");
	if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

applyTheme(getEffectiveTheme());

const mql = window.matchMedia("(prefers-color-scheme: light)");
if (mql.addEventListener) {
	mql.addEventListener("change", () => {
		if (!localStorage.getItem(THEME_KEY)) applyTheme(getEffectiveTheme());
	});
}

document.getElementById("theme-toggle")?.addEventListener("click", () => {
	const current = document.documentElement.getAttribute("data-theme");
	const next = current === "dark" ? "light" : "dark";
	localStorage.setItem(THEME_KEY, next);
	applyTheme(next);
});

// --- PWA detection (sessionStorage) ---
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
if (isStandalone) {
	sessionStorage.setItem("mydigital-ahlong_pwa_installed", "1");
}

// --- App state ---
let state: GroupState = createEmptyState();

initSync((updated) => {
	state = updated;
	render(state);
});

// --- Bootstrap ---
async function boot() {
	// Check for ?group=ID in URL
	const params = new URLSearchParams(window.location.search);
	const incomingGroupId = params.get("group");

	if (incomingGroupId) {
		window.history.replaceState(null, "", window.location.pathname);
		const result = await importGroup(incomingGroupId);
		if (result) {
			state = result.state;
			setLocalUpdatedAt(state.updatedAt || 0);
			render(state);
			subscribeToGroup(state.id);
			setupUI();
			return;
		}
		showToast("Couldn't load group — check your connection 💀");
	}

	// Try to load active group
	const activeId = getActiveGroupId();
	if (activeId) {
		const loaded = await loadGroup(activeId);
		if (loaded) {
			state = loaded;
			setLocalUpdatedAt(state.updatedAt || 0);
			render(state);
			subscribeToGroup(state.id);
			setupUI();
			return;
		}
	}

	// Try first group in list
	const myIds = getMyGroupIds();
	if (myIds.length) {
		const firstId = myIds[0];
		setActiveGroupId(firstId);
		const loaded = await loadGroup(firstId);
		if (loaded) {
			state = loaded;
			setLocalUpdatedAt(state.updatedAt || 0);
			render(state);
			subscribeToGroup(state.id);
			setupUI();
			return;
		}
	}

	// No groups — show landing
	renderLanding();
	setupUI();
}

async function loadGroup(groupId: string): Promise<GroupState | null> {
	const cached = getCachedGroup(groupId);

	if (isFirebaseEnabled()) {
		const remote = await fetchGroup(groupId);
		if (remote) {
			const merged = cached ? mergeGroupStates(cached, remote) : remote;
			cacheGroup(merged);
			addMyGroupId(merged.id);
			return merged;
		}
	}

	return cached;
}

function setupUI() {
	setupEvents(
		() => state,
		(s) => {
			state = s;
			if (isFirebaseEnabled() && s.id) {
				subscribeToGroup(s.id);
			}
		},
	);
	setupInstallPrompt();

	// Randomize exchange rate meme link
	const memeLinks = [
		"https://youtu.be/ZZ5LpwO-An4?si=MP4ZzJaPiDM8-C-B",
		"https://youtu.be/dQw4w9WgXcQ",
		"https://youtu.be/_e9yMqmXWo0?si=JYKToCu8orPSgSkL",
		"https://youtu.be/Nk5XLCvGi9E?si=qRV9XKQtLXx4ptLQ",
	];
	const exchangeLink = document.getElementById("exchange-rate-link") as HTMLAnchorElement | null;
	if (exchangeLink) {
		exchangeLink.href = memeLinks[Math.floor(Math.random() * memeLinks.length)];
		exchangeLink.addEventListener("click", () => {
			exchangeLink.href = memeLinks[Math.floor(Math.random() * memeLinks.length)];
		});
	}
}

// --- Migration: push old localStorage data to Firebase ---
async function migrate() {
	const oldGroupsRaw = localStorage.getItem("mydigital-ahlong_groups");
	if (!oldGroupsRaw) return;

	try {
		const oldGroups = JSON.parse(oldGroupsRaw) as Array<{ id?: string; name: string; members: string[]; expenses: Array<Record<string, unknown>>; updatedAt?: number }>;
		const oldPayments: Record<string, string> = JSON.parse(localStorage.getItem("mydigital-ahlong_payments") || "{}");
		const oldAvatars: Record<string, string> = JSON.parse(localStorage.getItem("mydigital-ahlong_avatars") || "{}");
		const oldActiveIdx = parseInt(localStorage.getItem("mydigital-ahlong_active") || "0", 10);

		for (const og of oldGroups) {
			const id = og.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
			const members = (og.members || []).map((name: string) => ({
				name,
				payment: oldPayments[name] || "",
				avatar: oldAvatars[name] || "😀",
			}));

			const expenses = (og.expenses || []).map((e: Record<string, unknown>) => {
				const amount = e.amount as number || 0;
				const originalAmount = e.originalAmount as number | undefined;
				const isDeleted = amount === 0 && !!originalAmount;
				const createdAt = e.createdAt as number || Date.parse(`${e.date}T${e.time || "00:00"}`) || Date.now();
				return {
					id: (e.id as string) || Date.now().toString(36),
					type: "expense" as const,
					desc: ((e.desc as string) || "").replace(/^❌ Deleted: /, ""),
					amount: isDeleted ? (originalAmount || 0) : amount,
					paidBy: (e.paidBy as string) || "",
					splitAmong: (e.splitAmong as string[]) || [],
					splitType: "equal" as const,
					currency: (e.currency as string) || "MYR",
					date: createdAt,
					createdAt,
					updatedAt: createdAt,
					deleted: isDeleted,
				};
			});

			const group: GroupState = {
				id,
				name: og.name || "Unnamed",
				members,
				expenses,
				createdAt: expenses.length ? Math.min(...expenses.map((e) => e.createdAt)) : Date.now(),
				updatedAt: og.updatedAt || Date.now(),
			};

			cacheGroup(group);
			addMyGroupId(group.id);
			commit(group);
		}

		// Set active group
		const activeGroup = oldGroups[Math.min(oldActiveIdx, oldGroups.length - 1)];
		if (activeGroup?.id) setActiveGroupId(activeGroup.id);
		else if (oldGroups.length) setActiveGroupId(getMyGroupIds()[0]);

		// Clean up old keys
		localStorage.removeItem("mydigital-ahlong_groups");
		localStorage.removeItem("mydigital-ahlong_payments");
		localStorage.removeItem("mydigital-ahlong_avatars");
		localStorage.removeItem("mydigital-ahlong_active");
	} catch {
		// Migration failed — leave old data alone
	}
}

// --- Start ---
migrate().then(boot);
