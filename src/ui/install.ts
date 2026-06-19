import { $, showToast } from "../shared/utils";

const INSTALL_PROMPTED_KEY = "mydigital-ahlong_install_prompted";
const EXPENSE_COUNT_KEY = "mydigital-ahlong_expense_count";
const EXPENSE_THRESHOLD = 3;

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function isStandalone(): boolean {
	return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function setupInstallPrompt(): void {
	const installBanner = $("#install-banner") as HTMLElement;

	if (isStandalone() || sessionStorage.getItem("install_banner_dismissed")) {
		installBanner.hidden = true;
		return;
	}

	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		deferredPrompt = e as BeforeInstallPromptEvent;
	});

	const handleInstallClick = async () => {
		if (deferredPrompt) {
			await deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			if (outcome === "accepted") {
				showToast("App installed! 🎉");
				installBanner.hidden = true;
			}
			deferredPrompt = null;
		} else {
			const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
			const msg = isIOS ? "Tap Share (↑) → Add to Home Screen" : "Menu (⋮) → Install app / Add to Home Screen";
			showToast(msg);
		}
	};

	$("#install-btn").addEventListener("click", handleInstallClick);

	$("#install-dismiss").addEventListener("click", () => {
		installBanner.hidden = true;
		sessionStorage.setItem("install_banner_dismissed", "1");
	});

	// Register service worker
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/mydigital-ahlong/sw.js").catch(() => {});
	}
}

/** Call this after each expense is added to maybe trigger the install prompt */
export function trackExpenseForInstall(): void {
	if (isStandalone() || localStorage.getItem(INSTALL_PROMPTED_KEY)) return;

	const count = parseInt(localStorage.getItem(EXPENSE_COUNT_KEY) || "0", 10) + 1;
	localStorage.setItem(EXPENSE_COUNT_KEY, String(count));

	if (count >= EXPENSE_THRESHOLD) {
		localStorage.setItem(INSTALL_PROMPTED_KEY, "1");
		showInstallModal();
	}
}

function showInstallModal(): void {
	const modal = document.querySelector("#install-modal") as HTMLElement;
	if (!modal) return;
	modal.hidden = false;

	const yesBtn = modal.querySelector("#install-modal-yes") as HTMLButtonElement;
	const nahBtn = modal.querySelector("#install-modal-nah") as HTMLButtonElement;

	const cleanup = () => {
		modal.hidden = true;
	};

	yesBtn.onclick = async () => {
		cleanup();
		if (deferredPrompt) {
			await deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			if (outcome === "accepted") {
				showToast("App installed! 🎉");
				($("#install-banner") as HTMLElement).hidden = true;
			}
			deferredPrompt = null;
		} else {
			const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
			const msg = isIOS ? "Tap Share (↑) → Add to Home Screen" : "Menu (⋮) → Install app / Add to Home Screen";
			showToast(msg);
		}
	};

	nahBtn.onclick = cleanup;
}
