import type { GroupState } from "./core/types";
import { createEmptyState, getMyGroupIds, addMyGroupId, getActiveGroupId, setActiveGroupId, cacheGroup, getCachedGroup } from "./core/state";
import { render, renderLanding } from "./ui/render";
import { setupEvents } from "./ui/events";
import { setupInstallPrompt } from "./ui/install";
import { showToast } from "./shared/utils";
import { isFirebaseEnabled, fetchGroup } from "./core/firebase";
import { initSync, subscribeToGroup, importGroup, flushPendingWrites } from "./core/sync";

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
	const params = new URLSearchParams(window.location.search);
	const incomingGroupId = params.get("group");

	if (incomingGroupId) {
		window.history.replaceState(null, "", window.location.pathname);
		const result = await importGroup(incomingGroupId);
		if (result) {
			state = result.state;

			render(state);
			subscribeToGroup(state.id);
			setupUI();
			return;
		}
		showToast("Couldn't load group — check your connection 💀");
	}

	const activeId = getActiveGroupId();
	if (activeId) {
		const loaded = await loadGroup(activeId);
		if (loaded) {
			state = loaded;

			render(state);
			subscribeToGroup(state.id);
			setupUI();
			return;
		}
	}

	const myIds = getMyGroupIds();
	if (myIds.length) {
		const firstId = myIds[0];
		setActiveGroupId(firstId);
		const loaded = await loadGroup(firstId);
		if (loaded) {
			state = loaded;

			render(state);
			subscribeToGroup(state.id);
			setupUI();
			return;
		}
	}

	renderLanding();
	setupUI();
}

async function loadGroup(groupId: string): Promise<GroupState | null> {
	if (isFirebaseEnabled()) {
		const remote = await fetchGroup(groupId);
		if (remote) {
			// Firebase is source of truth — use remote directly
			cacheGroup(remote);
			addMyGroupId(remote.id);
			return remote;
		}
	}

	return getCachedGroup(groupId); // offline fallback
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

// --- Flush pending writes on page hide/unload ---
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "hidden") {
		flushPendingWrites();
	}
});
window.addEventListener("beforeunload", () => {
	flushPendingWrites();
});

// --- Start ---
boot();
