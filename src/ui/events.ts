import type { GroupState } from "../core/types";
import { $, $$ } from "../shared/utils";
import { showToast } from "../shared/utils";
import {
	createEmptyState,
	randomGroupName,
	loadGroups,
	saveGroups,
	getActiveIndex,
	setActiveIndex,
	loadPaymentMethods,
	savePaymentMethods,
	loadAvatars,
	saveAvatars,
	decodeState,
	encodeState,
} from "../core/state";
import { addMember, removeMember, addExpense, renameMember } from "../core/expenses";
import { showDialog, showMemberMenu, showPayUpModal, showSettledModal } from "./dialogs";
import { render, renderLanding, getSymbol, getIam, setIam, setCurrencyOrder, getOrderedCurrencies } from "./render";
import { trackExpenseForInstall } from "./install";
import { isFirebaseEnabled } from "../core/firebase";
import { commit, importGroup } from "../core/sync";

function getShareUrl(state: import("../core/types").GroupState): string {
	if (isFirebaseEnabled()) {
		return `${window.location.origin}${window.location.pathname}?group=${state.id}`;
	}
	const encoded = encodeState(state);
	return `${window.location.origin}${window.location.pathname}#${encoded}`;
}

export function setupEvents(getState: () => GroupState, setState: (s: GroupState) => void): void {
	const rerender = () => {
		commit(getState());
		render(getState());
	};

	// --- Landing page: Start a Group ---
	$("#landing-new-group-btn").addEventListener("click", () => {
		showDialog({
			type: "prompt",
			title: "New group name:",
			defaultValue: randomGroupName(),
			onRandomize: () => randomGroupName(),
			onConfirm: (name) => {
				const groups = loadGroups();
				groups.push(createEmptyState(name));
				saveGroups(groups);
				setActiveIndex(groups.length - 1);
				setState(groups[groups.length - 1]);
				rerender();
			},
		});
	});

	// --- Group tabs ---
	$("#group-tabs").addEventListener("click", (e) => {
		const tab = (e.target as HTMLElement).closest("[data-group-idx]") as HTMLElement | null;
		if (tab) {
			const idx = parseInt(tab.dataset.groupIdx!, 10);
			setActiveIndex(idx);
			setState(loadGroups()[idx]);
			rerender();
			return;
		}
		if ((e.target as HTMLElement).closest("#new-group-btn")) {
			showDialog({
				type: "prompt",
				title: "New group name:",
				defaultValue: randomGroupName(),
				onRandomize: () => randomGroupName(),
				onConfirm: (name) => {
					const groups = loadGroups();
					groups.push(createEmptyState(name));
					saveGroups(groups);
					setActiveIndex(groups.length - 1);
					setState(groups[groups.length - 1]);
					rerender();
				},
			});
		}
	});

	// --- Group name edit ---
	$("#group-name").addEventListener("click", () => {
		showDialog({
			type: "prompt",
			title: "Group name:",
			defaultValue: getState().name,
			onRandomize: () => randomGroupName(),
			onConfirm: (name) => {
				getState().name = name!;
				rerender();
			},
		});
	});

	// --- Delete group ---
	$("#delete-group-btn").addEventListener("click", () => {
		showDialog({
			type: "confirm",
			title: `Delete group "${getState().name}"? 💀`,
			onConfirm: () => {
				const groups = loadGroups();
				const idx = getActiveIndex();
				groups.splice(idx, 1);
				saveGroups(groups);
				if (!groups.length) {
					setState(createEmptyState());
					renderLanding();
					return;
				}
				const newIdx = Math.min(idx, groups.length - 1);
				setActiveIndex(newIdx);
				setState(groups[newIdx]);
				rerender();
			},
		});
	});

	// --- I am selector ---
	$("#iam-select").addEventListener("change", (e) => {
		setIam((e.target as HTMLSelectElement).value);
		rerender();
	});

	// --- Add member ---
	$("#add-member-form").addEventListener("submit", (e) => {
		e.preventDefault();
		const input = $("#member-input") as HTMLInputElement;
		const paymentInput = $("#member-payment") as HTMLInputElement;
		const name = input.value.trim();
		const payment = paymentInput.value.trim();
		if (!name) return;
		addMember(getState(), name);
		if (payment) {
			const payments = loadPaymentMethods();
			payments[name] = payment;
			savePaymentMethods(payments);
		}
		input.value = "";
		paymentInput.value = "";
		rerender();
		showToast(`👋 ${name} joined the gang`);
	});

	// --- Member actions ---
	$("#members-list").addEventListener("click", (e) => {
		const tag = (e.target as HTMLElement).closest("[data-member]") as HTMLElement | null;
		if (!tag) return;
		const name = tag.dataset.member!;
		const payments = loadPaymentMethods();
		const currentPayment = payments[name] || "";
		showMemberMenu(
			name,
			currentPayment,
			rerender,
			(memberName) => {
				removeMember(getState(), memberName);
			},
			(oldName, newName) => {
				renameMember(getState(), oldName, newName);
				// Migrate payment method
				const pm = loadPaymentMethods();
				if (pm[oldName]) {
					pm[newName] = pm[oldName];
					delete pm[oldName];
					savePaymentMethods(pm);
				}
				// Migrate avatar
				const avatars = loadAvatars();
				if (avatars[oldName]) {
					avatars[newName] = avatars[oldName];
					delete avatars[oldName];
					saveAvatars(avatars);
				}
				rerender();
				showToast(`✏️ Renamed "${oldName}" → "${newName}"`);
			},
		);
	});

	// --- Split checkbox styling (Android compat) ---
	$("#split-checkboxes").addEventListener("change", (e) => {
		const input = e.target as HTMLInputElement;
		const label = input.closest(".split-label");
		if (label) label.classList.toggle("checked", input.checked);
	});

	// --- Split all/none toggle ---
	$("#split-checkboxes").addEventListener("click", (e) => {
		const btn = (e.target as HTMLElement).closest(".split-toggle") as HTMLElement | null;
		if (!btn) return;
		const checkAll = btn.dataset.action === "all";
		const checkboxes = [...$$("#split-checkboxes input[type=checkbox]")] as HTMLInputElement[];
		checkboxes.forEach((cb) => {
			cb.checked = checkAll;
			const label = cb.closest(".split-label");
			if (label) label.classList.toggle("checked", checkAll);
		});
	});

	// --- Add expense ---
	$("#add-expense-form").addEventListener("submit", (e) => {
		e.preventDefault();
		const desc = ($("#expense-desc") as HTMLInputElement).value.trim();
		const amount = parseFloat(($("#expense-amount") as HTMLInputElement).value);
		const paidBy = ($("#paid-by") as HTMLSelectElement).value;
		const currency = ($("#expense-currency") as HTMLSelectElement).value;
		const splitAmong = [...$$("#split-checkboxes input:checked")].map((cb) => (cb as HTMLInputElement).value);

		if (!desc || !amount || !paidBy || !splitAmong.length) {
			showDialog({ type: "error", title: "Fill in all fields lah 🫠" });
			return;
		}

		addExpense(getState(), { desc, amount, paidBy, splitAmong, currency, addedBy: getIam() });
		($("#expense-desc") as HTMLInputElement).value = "";
		($("#expense-amount") as HTMLInputElement).value = "";
		rerender();
		showToast(`🧧 Added: ${desc} (${getSymbol(currency)}${amount.toFixed(2)})`);
		trackExpenseForInstall();
	});

	// --- Delete expense ---
	$("#expenses-list").addEventListener("click", (e) => {
		const btn = (e.target as HTMLElement).closest("[data-remove-expense]") as HTMLElement | null;
		if (btn) {
			const id = btn.dataset.removeExpense!;
			const expense = getState().expenses.find((ex) => ex.id === id);
			if (!expense) return;
			showDialog({
				type: "confirm",
				title: `Delete "${expense.desc}"? 🗑️`,
				onConfirm: () => {
					expense.originalAmount = expense.amount;
					expense.desc = `❌ Deleted: ${expense.desc}`;
					expense.amount = 0;
					expense.splitAmong = [];
					rerender();
				},
			});
		}
	});

	// --- Share buttons ---
	$("#share-btn").addEventListener("click", async () => {
		const url = getShareUrl(getState());
		if (navigator.share) {
			try {
				await navigator.share({
					title: "MyDigitalAhLong 🤜💰",
					text: "Check out our expenses on MyDigitalAhLong",
					url,
				});
				return;
			} catch (e) {
				if ((e as DOMException).name === "AbortError") return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			showToast("Link copied! Share it with your group 🔗");
		} catch {
			showDialog({ type: "success", title: "Copy this link manually (clipboard denied lol)" });
		}
	});

	$("#share-whatsapp").addEventListener("click", () => {
		const url = getShareUrl(getState());
		const text = `Check out our expenses on MyDigitalAhLong 🤜💰\n${url}`;
		window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
	});

	$("#share-telegram").addEventListener("click", () => {
		const url = getShareUrl(getState());
		const text = `Check out our expenses on MyDigitalAhLong 🤜💰`;
		window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
	});

	$("#share-twitter").addEventListener("click", () => {
		const url = getShareUrl(getState());
		const text = `Splitting bills with the gang using MyDigitalAhLong 🤜💰 No login, no backend — just vibes`;
		window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
	});

	$("#share-facebook").addEventListener("click", () => {
		const url = getShareUrl(getState());
		const quote = `Check out our expenses on MyDigitalAhLong 🤜💰`;
		window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`, "_blank");
	});

	$("#share-messenger").addEventListener("click", async () => {
		const url = getShareUrl(getState());
		if (navigator.share) {
			try {
				await navigator.share({
					title: "MyDigitalAhLong 🤜💰",
					text: "Check out our expenses on MyDigitalAhLong",
					url,
				});
				return;
			} catch (e) {
				if ((e as DOMException).name === "AbortError") return;
			}
		}
		const text = `Check out our expenses on MyDigitalAhLong 🤜💰\n${url}`;
		window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, "_blank");
	});

	// --- Settlement actions ---
	$("#settlement").addEventListener("click", (e) => {
		const settleBtn = (e.target as HTMLElement).closest("[data-settle-from]") as HTMLElement | null;
		if (settleBtn) {
			(e as Event).stopPropagation();
			const from = settleBtn.dataset.settleFrom!;
			const to = settleBtn.dataset.settleTo!;
			const currency = settleBtn.dataset.settleCurrency!;
			const amount = parseFloat(settleBtn.dataset.settleAmount!);
			const pm = loadPaymentMethods()[to] ? `\n💳 Pay via: ${loadPaymentMethods()[to]}` : "";
			showDialog({
				type: "confirm",
				title: `Mark ${from} → ${to} (${getSymbol(currency)}${amount.toFixed(2)}) as settled?${pm}`,
				onConfirm: () => {
					addExpense(getState(), {
						desc: `💸 Settlement: ${from} → ${to}`,
						amount,
						paidBy: from,
						splitAmong: [to],
						currency,
						addedBy: getIam(),
					});
					rerender();
				},
			});
			return;
		}

		const item = (e.target as HTMLElement).closest("[data-debt-from]") as HTMLElement | null;
		if (!item) return;
		const from = item.dataset.debtFrom!;
		const to = item.dataset.debtTo!;
		const debtAmount = item.dataset.debtAmount!;
		const currency = item.dataset.debtCurrency!;
		const rawAmount = item.dataset.debtRaw!;
		showPayUpModal(from, to, debtAmount, currency, rawAmount);
	});

	// --- Modal close ---
	$("#modal-close").addEventListener("click", () => {
		$("#meme-modal").hidden = true;
	});
	$("#meme-modal").addEventListener("click", (e) => {
		if (e.target === e.currentTarget) $("#meme-modal").hidden = true;
	});

	// --- Modal settle button ---
	$("#modal-settle-btn").addEventListener("click", () => {
		const btn = $("#modal-settle-btn") as HTMLButtonElement;
		const from = btn.dataset.from!;
		const to = btn.dataset.to!;
		const currency = btn.dataset.currency!;
		const amount = parseFloat(btn.dataset.amount!);
		$("#meme-modal").hidden = true;
		addExpense(getState(), {
			desc: `💸 Settlement: ${from} → ${to}`,
			amount,
			paidBy: from,
			splitAmong: [to],
			currency,
			addedBy: getIam(),
		});
		rerender();
		setTimeout(() => showSettledModal(from, to), 300);
	});

	// --- Currency drag and drop ---
	const pillContainer = $("#currency-pills");
	let draggedPill: HTMLElement | null = null;

	pillContainer.addEventListener("dragstart", (e) => {
		const pill = (e.target as HTMLElement).closest("[data-currency]") as HTMLElement | null;
		if (!pill) return;
		draggedPill = pill;
		pill.classList.add("dragging");
		(e as DragEvent).dataTransfer!.effectAllowed = "move";
	});

	pillContainer.addEventListener("dragend", () => {
		if (draggedPill) draggedPill.classList.remove("dragging");
		draggedPill = null;
	});

	pillContainer.addEventListener("dragover", (e) => {
		e.preventDefault();
		(e as DragEvent).dataTransfer!.dropEffect = "move";
		const target = (e.target as HTMLElement).closest("[data-currency]") as HTMLElement | null;
		if (!target || target === draggedPill) return;
		const rect = target.getBoundingClientRect();
		const midX = rect.left + rect.width / 2;
		if ((e as MouseEvent).clientX < midX) {
			pillContainer.insertBefore(draggedPill!, target);
		} else {
			pillContainer.insertBefore(draggedPill!, target.nextSibling);
		}
	});

	pillContainer.addEventListener("drop", (e) => {
		e.preventDefault();
		const pills = [...pillContainer.querySelectorAll("[data-currency]")] as HTMLElement[];
		const newOrder = pills.map((p) => p.dataset.currency!);
		const prevFirst = getOrderedCurrencies()[0]?.code;
		setCurrencyOrder(newOrder);
		render(getState());
		if (newOrder[0] !== prevFirst) {
			showToast(`Reordered! ${newOrder[0]} is now on top 👆`);
		}
	});

	// --- Touch drag ---
	let touchDragPill: HTMLElement | null = null;

	pillContainer.addEventListener(
		"touchstart",
		(e) => {
			const pill = (e.target as HTMLElement).closest("[data-currency]") as HTMLElement | null;
			if (!pill) return;
			touchDragPill = pill;
			pill.classList.add("dragging");
		},
		{ passive: true },
	);

	pillContainer.addEventListener(
		"touchmove",
		(e) => {
			if (!touchDragPill) return;
			e.preventDefault();
			const touch = (e as TouchEvent).touches[0];
			const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
			if (!target) return;
			const pill = target.closest("[data-currency]") as HTMLElement | null;
			if (!pill || pill === touchDragPill) return;
			const rect = pill.getBoundingClientRect();
			const midX = rect.left + rect.width / 2;
			if (touch.clientX < midX) {
				pillContainer.insertBefore(touchDragPill, pill);
			} else {
				pillContainer.insertBefore(touchDragPill, pill.nextSibling);
			}
		},
		{ passive: false },
	);

	pillContainer.addEventListener("touchend", () => {
		if (!touchDragPill) return;
		touchDragPill.classList.remove("dragging");
		const pills = [...pillContainer.querySelectorAll("[data-currency]")] as HTMLElement[];
		const newOrder = pills.map((p) => p.dataset.currency!);
		const prevFirst = getOrderedCurrencies()[0]?.code;
		setCurrencyOrder(newOrder);
		touchDragPill = null;
		render(getState());
		if (newOrder[0] !== prevFirst) {
			showToast(`Reordered! ${newOrder[0]} is now on top 👆`);
		}
	});

	// --- Import group by pasting link ---
	const handleImportLink = (input: HTMLInputElement) => {
		const url = input.value.trim();
		const hashIdx = url.indexOf("#");
		if (hashIdx === -1 || !url.slice(hashIdx + 1)) {
			showToast("No group data found in that link 🤔");
			return;
		}
		const hash = url.slice(hashIdx + 1);
		const imported = decodeState(hash);
		if (!imported) {
			showToast("Invalid link — couldn't decode group data 💀");
			return;
		}
		const result = importGroup(imported);
		setState(result);
		render(getState());
		input.value = "";
	};

	$("#import-link-form").addEventListener("submit", (e) => {
		e.preventDefault();
		handleImportLink($("#import-link-input") as HTMLInputElement);
	});

	const landingImportForm = document.querySelector("#landing-import-form");
	if (landingImportForm) {
		landingImportForm.addEventListener("submit", (e) => {
			e.preventDefault();
			handleImportLink(document.querySelector("#landing-import-input") as HTMLInputElement);
		});
	}
}
