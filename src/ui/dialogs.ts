import type { DialogOptions } from "../core/types";
import { $, esc, pickRandom, showToast } from "../shared/utils";
import { loadAvatars, saveAvatars, loadPaymentMethods, savePaymentMethods, AVATAR_OPTIONS } from "../core/state";

// --- Dialog constants ---

const DIALOG_EMOJIS: Record<string, string[]> = {
	error: ["🚨", "💀", "🫠", "😱", "🤦"],
	confirm: ["🤔", "👀", "⚠️", "🫣", "😬"],
	prompt: ["✏️", "📝", "🧐", "💭", "🫡"],
	success: ["✅", "🎉", "🥳", "💅", "🔥"],
};

const DIALOG_QUOTES: Record<string, string[]> = {
	error: ["skill issue tbh", "the form said REQUIRED bestie", "did you even try?? 😭", "bro really left it blank", "*slow clap*", "error 404: effort not found"],
	confirm: ["no take-backsies...", "are you SURE sure?", "this is your villain arc", "think carefully... or don't idc", "consequences have actions or whatever", "once it's gone, it's gone bestie"],
	prompt: ["make it iconic", "choose wisely (or not, it's just a name)", "naming things is the hardest problem in CS", "no pressure... ok maybe a little pressure", "type something fire 🔥"],
};

const MEME_QUOTES: string[] = [
	"friendship ended with {from}. now money is my best friend.",
	"bro really said 'i'll transfer later' 3 weeks ago 💀",
	"{from} acting like this is a charity",
	"the audacity... the AUDACITY",
	"*seen* ✓✓",
	"this is why we have trust issues",
	"imagine being {from} rn... couldn't be me",
	"{from}'s wallet: 👻",
	"PayNow exists bro... PayNow EXISTS",
	"every day you don't pay, the group chat gets more passive aggressive",
	"you vs the debt {to} told you not to worry about",
	"POV: you're waiting for {from} to pay back",
	"i'm not angry, i'm just disappointed - {to}, probably",
	"this message was sponsored by {from}'s outstanding debt",
	"bro thinks we forgot 💀",
];

const MEME_EMOJIS: string[] = ["💀", "🫠", "😤", "🤡", "💸", "🧾", "😭", "🫵", "👀", "🚨"];

const SETTLE_QUOTES: string[] = [
	"FRIENDSHIP RESTORED 🤝",
	"the debt has been yeeted into the void",
	"*bank notification sound* 🔔",
	"wow {from} actually paid... mark the calendar",
	"character development fr fr",
	"we love a responsible king/queen 👑",
	"{from} redemption arc complete",
	"the group chat can finally rest",
	"trust level: restored (for now)",
];

const SETTLE_EMOJIS: string[] = ["🎉", "🥳", "🙏", "💰", "🫶", "✨", "🌟"];

// --- Helper ---

function getAvatar(name: string): string {
	const avatars = loadAvatars();
	return avatars[name] || "😀";
}

// --- Show Dialog ---

export function showDialog({ type = "error", title, defaultValue = "", onConfirm, onCancel, allowEmpty = false, onRandomize }: DialogOptions): void {
	const modal = $("#dialog-modal");
	const emojiEl = $("#dialog-emoji");
	const titleEl = $("#dialog-title");
	const quoteEl = $("#dialog-quote");
	const inputEl = $("#dialog-input") as HTMLInputElement;
	const buttonsEl = $("#dialog-buttons");

	emojiEl.textContent = pickRandom(DIALOG_EMOJIS[type] || DIALOG_EMOJIS.error);
	titleEl.textContent = title;
	quoteEl.textContent = `"${pickRandom(DIALOG_QUOTES[type] || DIALOG_QUOTES.error)}"`;

	if (type === "prompt") {
		inputEl.hidden = false;
		inputEl.value = defaultValue;
		setTimeout(() => inputEl.focus(), 100);
		const randomBtn = document.getElementById("dialog-randomize");
		if (randomBtn) {
			if (onRandomize) {
				randomBtn.hidden = false;
				randomBtn.onclick = () => {
					inputEl.value = onRandomize();
				};
			} else {
				randomBtn.hidden = true;
				randomBtn.onclick = null;
			}
		}
	} else {
		inputEl.hidden = true;
		inputEl.value = "";
		const randomBtn = document.getElementById("dialog-randomize");
		if (randomBtn) randomBtn.hidden = true;
	}

	const cleanup = () => {
		modal.hidden = true;
	};

	if (type === "error" || type === "success") {
		buttonsEl.innerHTML = `<button class="btn dialog-btn-ok">aight bet 👍</button>`;
		buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-ok")!.onclick = () => {
			cleanup();
			onConfirm?.();
		};
	} else if (type === "confirm") {
		buttonsEl.innerHTML = `
			<button class="btn dialog-btn-cancel">nah fam 🙅</button>
			<button class="btn dialog-btn-confirm">do it 🫡</button>
		`;
		buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-cancel")!.onclick = () => {
			cleanup();
			onCancel?.();
		};
		buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-confirm")!.onclick = () => {
			cleanup();
			onConfirm?.();
		};
	} else if (type === "prompt") {
		buttonsEl.innerHTML = `
			<button class="btn dialog-btn-cancel">nvm 🏃</button>
			<button class="btn dialog-btn-confirm">let's go 🚀</button>
		`;
		buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-cancel")!.onclick = () => {
			cleanup();
			onCancel?.();
		};
		buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-confirm")!.onclick = () => {
			const val = inputEl.value.trim();
			cleanup();
			if (val || allowEmpty) onConfirm?.(val);
		};
		inputEl.addEventListener("keydown", function handler(ev: KeyboardEvent) {
			if (ev.key === "Enter") {
				ev.preventDefault();
				inputEl.removeEventListener("keydown", handler);
				const val = inputEl.value.trim();
				cleanup();
				if (val || allowEmpty) onConfirm?.(val);
			}
			if (ev.key === "Escape") {
				inputEl.removeEventListener("keydown", handler);
				cleanup();
				onCancel?.();
			}
		});
	}

	modal.onclick = (e) => {
		if (e.target === modal) {
			cleanup();
			onCancel?.();
		}
	};

	modal.hidden = false;
}

// --- Member Menu ---

export function showMemberMenu(name: string, currentPayment: string, onRender: () => void, onRemove: (name: string) => void, onRename?: (oldName: string, newName: string) => void): void {
	const modal = $("#dialog-modal");
	const emojiEl = $("#dialog-emoji");
	const titleEl = $("#dialog-title");
	const quoteEl = $("#dialog-quote");
	const inputEl = $("#dialog-input") as HTMLInputElement;
	const buttonsEl = $("#dialog-buttons");

	emojiEl.textContent = getAvatar(name);
	titleEl.textContent = name;
	quoteEl.textContent = currentPayment ? `💳 ${currentPayment}` : "no payment method set";
	inputEl.hidden = true;

	buttonsEl.innerHTML = `
		<button class="btn dialog-btn-rename">✏️ Rename</button>
		<button class="btn dialog-btn-avatar">🎭 Change Icon</button>
		<button class="btn dialog-btn-payment">💳 Edit Payment</button>
		${currentPayment ? `<button class="btn dialog-btn-remove-payment">❌ Remove Payment</button>` : ""}
		<button class="btn dialog-btn-remove">🗑️ Remove Member</button>
		<button class="btn dialog-btn-cancel">close</button>
	`;

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-avatar")!.onclick = () => {
		modal.hidden = true;
		showAvatarPicker(name, onRender);
	};

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-rename")!.onclick = () => {
		modal.hidden = true;
		showDialog({
			type: "prompt",
			title: `Rename "${name}" to:`,
			defaultValue: name,
			onConfirm: (newName) => {
				if (newName && newName.trim() && newName.trim() !== name && onRename) {
					onRename(name, newName.trim());
				}
			},
		});
	};

	if (currentPayment) {
		buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-remove-payment")!.onclick = () => {
			modal.hidden = true;
			const pm = loadPaymentMethods();
			delete pm[name];
			savePaymentMethods(pm);
			onRender();
			showToast(`💳 Removed payment for ${name}`);
		};
	}

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-payment")!.onclick = () => {
		modal.hidden = true;
		showDialog({
			type: "prompt",
			title: `Payment method for ${name}:`,
			defaultValue: currentPayment,
			onConfirm: (val) => {
				const pm = loadPaymentMethods();
				if (val) {
					pm[name] = val;
				} else {
					delete pm[name];
				}
				savePaymentMethods(pm);
				onRender();
				showToast(val ? `💳 Updated payment for ${name}` : `💳 Removed payment for ${name}`);
			},
			allowEmpty: true,
		});
	};

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-remove")!.onclick = () => {
		modal.hidden = true;
		showDialog({
			type: "confirm",
			title: `Remove ${name}? Their expenses go poof too 💨`,
			onConfirm: () => {
				onRemove(name);
				const pm = loadPaymentMethods();
				delete pm[name];
				savePaymentMethods(pm);
				onRender();
			},
		});
	};

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-cancel")!.onclick = () => {
		modal.hidden = true;
	};

	modal.hidden = false;
}

// --- Avatar Picker ---

export function showAvatarPicker(name: string, onRender: () => void): void {
	const modal = $("#dialog-modal");
	const emojiEl = $("#dialog-emoji");
	const titleEl = $("#dialog-title");
	const quoteEl = $("#dialog-quote");
	const inputEl = $("#dialog-input") as HTMLInputElement;
	const buttonsEl = $("#dialog-buttons");

	emojiEl.textContent = getAvatar(name);
	titleEl.textContent = `Pick an icon for ${name}`;
	quoteEl.textContent = `"choose your fighter"`;
	inputEl.hidden = true;

	buttonsEl.innerHTML = `
		<div class="avatar-grid">
			${AVATAR_OPTIONS.map((a) => `<button class="avatar-option ${a === getAvatar(name) ? "avatar-selected" : ""}" data-avatar="${a}">${a}</button>`).join("")}
		</div>
	`;

	buttonsEl.querySelectorAll<HTMLButtonElement>("[data-avatar]").forEach((btn) => {
		btn.onclick = () => {
			const avatars = loadAvatars();
			avatars[name] = btn.dataset.avatar!;
			saveAvatars(avatars);
			modal.hidden = true;
			onRender();
			showToast(`${btn.dataset.avatar} Icon updated for ${name}`);
		};
	});

	modal.hidden = false;
}

// --- Pay Up Modal ---

export function showPayUpModal(from: string, to: string, amount: string, _currency: string, rawAmount: string): void {
	const quote = pickRandom(MEME_QUOTES)
		.replace(/\{from\}/g, from)
		.replace(/\{to\}/g, to);
	const emoji = pickRandom(MEME_EMOJIS);
	const pm = loadPaymentMethods()[to] || "";

	$("#modal-meme").textContent = emoji;
	$("#modal-msg").innerHTML = `<b>${esc(from)}</b> owes <b>${esc(to)}</b> <span class="modal-amount">${amount}</span>${pm ? `<br><span class="modal-payment">💳 Pay via: ${esc(pm)}</span>` : ""}`;
	$("#modal-quote").textContent = `"${quote}"`;

	const settleBtn = $("#modal-settle-btn") as HTMLButtonElement;
	settleBtn.style.display = "";
	settleBtn.dataset.from = from;
	settleBtn.dataset.to = to;
	settleBtn.dataset.currency = _currency;
	settleBtn.dataset.amount = rawAmount;
	$("#meme-modal").hidden = false;
}

// --- Settled Modal ---

export function showSettledModal(from: string, to: string): void {
	const quote = pickRandom(SETTLE_QUOTES)
		.replace(/\{from\}/g, from)
		.replace(/\{to\}/g, to);
	const emoji = pickRandom(SETTLE_EMOJIS);

	$("#modal-meme").textContent = emoji;
	$("#modal-msg").innerHTML = `<b>${esc(from)}</b> paid <b>${esc(to)}</b>`;
	$("#modal-quote").textContent = `"${quote}"`;
	($("#modal-settle-btn") as HTMLButtonElement).style.display = "none";
	$("#meme-modal").hidden = false;
}
