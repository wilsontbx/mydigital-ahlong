import type { GroupState } from "./core/types";
import { loadState, groupJustImported, decodeState } from "./core/state";
import { render } from "./ui/render";
import { setupEvents } from "./ui/events";
import { setupInstallPrompt } from "./ui/install";
import { showToast } from "./shared/utils";
import { isFirebaseEnabled } from "./core/firebase";
import { initSync, importGroup, subscribeToGroup, setLocalUpdatedAt } from "./core/sync";

// --- Theme: apply saved preference or system default before paint ---
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

const PWA_INSTALLED_KEY = "mydigital-ahlong_pwa_installed";
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

if (isStandalone) {
	localStorage.setItem(PWA_INSTALLED_KEY, "1");
}

let state: GroupState = loadState();
setLocalUpdatedAt(state.updatedAt || 0);

// --- Init sync: remote updates flow through here ---
initSync((updated) => {
	state = updated;
	render(state);
});

// --- Firebase: handle ?group=ID links ---
if (isFirebaseEnabled()) {
	const params = new URLSearchParams(window.location.search);
	const groupId = params.get("group");
	if (groupId) {
		import("firebase/database").then(({ ref, get, getDatabase }) => {
			const db = getDatabase();
			get(ref(db, `groups/${groupId}`)).then((snapshot) => {
				const data = snapshot.val() as GroupState | null;
				if (!data || !data.id) return;
				state = importGroup(data);
				render(state);
				window.history.replaceState(null, "", window.location.pathname);
			});
		});
	}
}

setupEvents(
	() => state,
	(s) => {
		state = s;
		if (isFirebaseEnabled() && s.id) {
			subscribeToGroup(s.id);
		}
	},
);

render(state);
setupInstallPrompt();

// --- Firebase: subscribe to real-time updates for active group ---
if (isFirebaseEnabled() && state.id) {
	subscribeToGroup(state.id);
}

// Randomize exchange rate meme link on every click
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

if (groupJustImported) {
	showToast(`Group "${state.name}" added! ✅`);
} else if (window.location.hash && !isStandalone && localStorage.getItem(PWA_INSTALLED_KEY)) {
	showToast("Group synced! Open the app to view it 📲");
}

// --- Cross-context sync via service worker (for iOS 16 where localStorage is isolated) ---

if (window.location.hash && !isStandalone && navigator.serviceWorker?.controller) {
	navigator.serviceWorker.controller.postMessage({
		type: "SYNC_HASH",
		hash: window.location.hash.slice(1),
	});
}

if (isStandalone && navigator.serviceWorker) {
	navigator.serviceWorker.ready.then((reg) => {
		if (!reg.active) return;

		const channel = new MessageChannel();
		channel.port1.onmessage = (event) => {
			if (event.data?.type === "PENDING_HASH" && event.data.hash) {
				const imported = decodeState(event.data.hash);
				if (!imported) return;
				state = importGroup(imported);
				render(state);
			}
		};
		reg.active.postMessage({ type: "GET_PENDING_HASH" }, [channel.port2]);
	});
}
