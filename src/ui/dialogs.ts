import type { DialogOptions, GroupState } from "../core/types";
import { $, pickRandom, showToast } from "../shared/utils";
import { AVATAR_OPTIONS } from "../core/state";

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

// --- Show Dialog ---

export function showDialog({ type = "error", title, defaultValue = "", onConfirm, onCancel, allowEmpty = false, onRandomize }: DialogOptions): void {
	const modal = $("#dialog-modal");
	const dialogBox = modal.querySelector(".dialog-modal") as HTMLElement | null;
	const emojiEl = $("#dialog-emoji");
	const titleEl = $("#dialog-title");
	const quoteEl = $("#dialog-quote");
	const inputEl = $("#dialog-input") as HTMLInputElement;
	const buttonsEl = $("#dialog-buttons");

	if (dialogBox) dialogBox.dataset.type = type;
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

interface MemberMenuCallbacks {
	onAvatarChange: (avatar: string) => void;
	onPaymentChange: (payment: string) => void;
	onRemove: () => void;
	onRename: (newName: string) => void;
}

export function showMemberMenu(state: GroupState, name: string, callbacks: MemberMenuCallbacks): void {
	const member = state.members.find((m) => m.name === name);
	if (!member) return;

	const modal = $("#dialog-modal");
	const emojiEl = $("#dialog-emoji");
	const titleEl = $("#dialog-title");
	const quoteEl = $("#dialog-quote");
	const inputEl = $("#dialog-input") as HTMLInputElement;
	const buttonsEl = $("#dialog-buttons");

	emojiEl.textContent = member.avatar;
	titleEl.textContent = name;
	quoteEl.textContent = member.payment ? `💳 ${member.payment}` : "no payment method set";
	inputEl.hidden = true;

	buttonsEl.innerHTML = `
		<button class="btn dialog-btn-rename">✏️ Rename</button>
		<button class="btn dialog-btn-avatar">🎭 Change Icon</button>
		<button class="btn dialog-btn-payment">💳 Edit Payment</button>
		${member.payment ? `<button class="btn dialog-btn-remove-payment">❌ Remove Payment</button>` : ""}
		<button class="btn dialog-btn-remove">🗑️ Remove Member</button>
		<button class="btn dialog-btn-cancel">close</button>
	`;

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-avatar")!.onclick = () => {
		modal.hidden = true;
		showAvatarPicker(name, member.avatar, callbacks.onAvatarChange);
	};

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-rename")!.onclick = () => {
		modal.hidden = true;
		showDialog({
			type: "prompt",
			title: `Rename "${name}" to:`,
			defaultValue: name,
			onConfirm: (newName) => {
				if (newName && newName.trim() && newName.trim() !== name) {
					callbacks.onRename(newName.trim());
				}
			},
		});
	};

	if (member.payment) {
		buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-remove-payment")!.onclick = () => {
			modal.hidden = true;
			callbacks.onPaymentChange("");
			showToast(`💳 Removed payment for ${name}`);
		};
	}

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-payment")!.onclick = () => {
		modal.hidden = true;
		showDialog({
			type: "prompt",
			title: `Payment method for ${name}:`,
			defaultValue: member.payment,
			onConfirm: (val) => {
				callbacks.onPaymentChange(val || "");
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
				callbacks.onRemove();
			},
		});
	};

	buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-cancel")!.onclick = () => {
		modal.hidden = true;
	};

	modal.hidden = false;
}

// --- Avatar Picker ---

function showAvatarPicker(name: string, currentAvatar: string, onPick: (avatar: string) => void): void {
	const modal = $("#dialog-modal");
	const emojiEl = $("#dialog-emoji");
	const titleEl = $("#dialog-title");
	const quoteEl = $("#dialog-quote");
	const inputEl = $("#dialog-input") as HTMLInputElement;
	const buttonsEl = $("#dialog-buttons");

	emojiEl.textContent = currentAvatar;
	titleEl.textContent = `Pick an icon for ${name}`;
	quoteEl.textContent = `"choose your fighter"`;
	inputEl.hidden = true;

	buttonsEl.innerHTML = `
		<div class="avatar-grid">
			${AVATAR_OPTIONS.map((a) => `<button class="avatar-option ${a === currentAvatar ? "avatar-selected" : ""}" data-avatar="${a}">${a}</button>`).join("")}
		</div>
	`;

	buttonsEl.querySelectorAll<HTMLButtonElement>("[data-avatar]").forEach((btn) => {
		btn.onclick = () => {
			modal.hidden = true;
			onPick(btn.dataset.avatar!);
			showToast(`${btn.dataset.avatar} Icon updated for ${name}`);
		};
	});

	modal.hidden = false;
}

// --- Settled Modal (uses dialog system) ---

export function showSettledModal(from: string, to: string): void {
	const quote = pickRandom(SETTLE_QUOTES)
		.replace(/\{from\}/g, from)
		.replace(/\{to\}/g, to);
	const emoji = pickRandom(SETTLE_EMOJIS);

	showDialog({
		type: "success",
		title: `${from} paid ${to}! ${emoji}`,
		onConfirm: () => {},
	});

	const quoteEl = $("#dialog-quote");
	quoteEl.textContent = `"${quote}"`;
}
