import type { GroupState } from "../core/types";
import { $, $$ } from "../shared/utils";
import { showToast } from "../shared/utils";
import {
	createEmptyState,
	randomGroupName,
	getMyGroupIds,
	addMyGroupId,
	removeMyGroupId,
	setActiveGroupId,
	cacheGroup,
	getCachedGroup,
	removeCachedGroup,
} from "../core/state";
import { addMember, removeMember, addExpense, deleteExpense, renameMember } from "../core/expenses";
import { showDialog, showMemberMenu } from "./dialogs";
import { render, renderLanding, getSymbol, setCurrencyOrder, getOrderedCurrencies } from "./render";
import { trackExpenseForInstall } from "./install";
import { commit, subscribeToGroup, importGroup, flushToFirebase } from "../core/sync";

function getShareUrl(state: GroupState): string {
	return `${window.location.origin}${window.location.pathname}?group=${state.id}`;
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
				const newGroup = createEmptyState(name);
				cacheGroup(newGroup);
				addMyGroupId(newGroup.id);
				setActiveGroupId(newGroup.id);
				setState(newGroup);
				rerender();
				subscribeToGroup(newGroup.id);
			},
		});
	});

	// --- Group tabs ---
	$("#group-tabs").addEventListener("click", (e) => {
		const tab = (e.target as HTMLElement).closest("[data-group-id]") as HTMLElement | null;
		if (tab) {
			const groupId = tab.dataset.groupId!;
			setActiveGroupId(groupId);
			const cached = getCachedGroup(groupId);
			if (cached) {
				setState(cached);
				render(cached);
			}
			subscribeToGroup(groupId);
			return;
		}
		if ((e.target as HTMLElement).closest("#new-group-btn")) {
			showDialog({
				type: "prompt",
				title: "New group name:",
				defaultValue: randomGroupName(),
				onRandomize: () => randomGroupName(),
				onConfirm: (name) => {
					const newGroup = createEmptyState(name);
					cacheGroup(newGroup);
					addMyGroupId(newGroup.id);
					setActiveGroupId(newGroup.id);
					setState(newGroup);
					rerender();
					subscribeToGroup(newGroup.id);
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

	// --- Leave group ---
	$("#delete-group-btn").addEventListener("click", () => {
		showDialog({
			type: "confirm",
			title: `Leave group "${getState().name}"? 👋`,
			onConfirm: () => {
				const id = getState().id;
				removeMyGroupId(id);
				removeCachedGroup(id);

				const remainingIds = getMyGroupIds();
				if (!remainingIds.length) {
					setState(createEmptyState());
					renderLanding();
					return;
				}
				const nextId = remainingIds[0];
				setActiveGroupId(nextId);
				const cached = getCachedGroup(nextId);
				if (cached) {
					setState(cached);
					render(cached);
					subscribeToGroup(nextId);
				}
			},
		});
	});


	// --- Add member ---
	$("#add-member-form").addEventListener("submit", (e) => {
		e.preventDefault();
		const input = $("#member-input") as HTMLInputElement;
		const paymentInput = $("#member-payment") as HTMLInputElement;
		const name = input.value.trim();
		const payment = paymentInput.value.trim();
		if (!name) return;
		addMember(getState(), name, payment);
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
		showMemberMenu(getState(), name, {
			onAvatarChange: (avatar) => {
				const member = getState().members.find((m) => m.name === name);
				if (member) member.avatar = avatar;
				rerender();
			},
			onPaymentChange: (payment) => {
				const member = getState().members.find((m) => m.name === name);
				if (member) member.payment = payment;
				rerender();
			},
			onRemove: () => {
				removeMember(getState(), name);
				rerender();
			},
			onRename: (newName) => {
				renameMember(getState(), name, newName);
				rerender();
				showToast(`✏️ Renamed "${name}" → "${newName}"`);
			},
		});
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

		addExpense(getState(), { desc, amount, paidBy, splitAmong, currency });
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
					deleteExpense(getState(), id);
					rerender();
				},
			});
		}
	});

	// --- Share buttons ---
	$("#share-btn").addEventListener("click", async () => {
		await flushToFirebase(getState());
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

	$("#share-whatsapp").addEventListener("click", async () => {
		await flushToFirebase(getState());
		const url = getShareUrl(getState());
		const text = `Check out our expenses on MyDigitalAhLong 🤜💰\n${url}`;
		window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
	});

	$("#share-telegram").addEventListener("click", async () => {
		await flushToFirebase(getState());
		const url = getShareUrl(getState());
		const text = `Check out our expenses on MyDigitalAhLong 🤜💰`;
		window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
	});

	$("#share-twitter").addEventListener("click", async () => {
		await flushToFirebase(getState());
		const url = getShareUrl(getState());
		const text = `Splitting bills with the gang using MyDigitalAhLong 🤜💰 No login, no backend — just vibes`;
		window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
	});

	$("#share-facebook").addEventListener("click", async () => {
		await flushToFirebase(getState());
		const url = getShareUrl(getState());
		const quote = `Check out our expenses on MyDigitalAhLong 🤜💰`;
		window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`, "_blank");
	});

	// --- Settlement actions ---
	$("#settlement").addEventListener("click", (e) => {
		const settleBtn = (e.target as HTMLElement).closest("[data-settle-from]") as HTMLElement | null;
		if (!settleBtn) return;
		const from = settleBtn.dataset.settleFrom!;
		const to = settleBtn.dataset.settleTo!;
		const currency = settleBtn.dataset.settleCurrency!;
		const amount = parseFloat(settleBtn.dataset.settleAmount!);
		const pm = getPayment(getState(), to);
		showDialog({
			type: "confirm",
			title: `Mark ${from} → ${to} (${getSymbol(currency)}${amount.toFixed(2)}) as settled?${pm ? `\n💳 Pay via: ${pm}` : ""}`,
			onConfirm: () => {
				addExpense(getState(), {
					desc: `💸 Settlement: ${from} → ${to}`,
					amount,
					paidBy: from,
					splitAmong: [to],
					currency,
				});
				rerender();
			},
		});
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
	const handleImportLink = async (input: HTMLInputElement) => {
		const url = input.value.trim();
		let groupId: string | null = null;
		try {
			const parsed = new URL(url);
			groupId = parsed.searchParams.get("group");
		} catch {
			showToast("Invalid link 🤔");
			return;
		}
		if (!groupId) {
			showToast("No group ID found in that link 🤔");
			return;
		}
		const result = await importGroup(groupId);
		if (!result) {
			showToast("Couldn't load group — check the link or your connection 💀");
			return;
		}
		setState(result.state);
		render(result.state);
		subscribeToGroup(result.state.id);
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

function getPayment(state: GroupState, name: string): string {
	const member = state.members.find((m) => m.name === name);
	return member?.payment || "";
}
