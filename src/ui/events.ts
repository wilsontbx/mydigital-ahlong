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
	clearActiveGroupId,
	cacheGroup,
	getCachedGroup,
	removeCachedGroup,
} from "../core/state";
import { addMember, removeMember, addExpense, editExpense, deleteExpense, renameMember } from "../core/expenses";
import { showDialog, showMemberMenu } from "./dialogs";
import { render, renderLanding, getSymbol, setCurrencyOrder, getOrderedCurrencies } from "./render";
import { trackExpenseForInstall } from "./install";
import { commit, subscribeToGroup, importGroup, flushToFirebase } from "../core/sync";

function getShareUrl(state: GroupState): string {
	return `${window.location.origin}${window.location.pathname}?group=${state.id}`;
}

export function setupEvents(getState: () => GroupState, setState: (s: GroupState) => void): void {
	let editingExpenseId: string | null = null;

	const rerender = () => {
		commit(getState());
		render(getState());
	};

	function enterEditMode(id: string) {
		const expense = getState().expenses.find((ex) => ex.id === id);
		if (!expense) return;
		editingExpenseId = id;

		($("#expense-desc") as HTMLInputElement).value = expense.desc;
		($("#expense-amount") as HTMLInputElement).value = expense.amount.toString();
		($("#expense-currency") as HTMLSelectElement).value = expense.currency;
		($("#expense-category") as HTMLSelectElement).value = expense.category || "";
		const d = new Date(expense.date || expense.createdAt);
		($("#expense-date") as HTMLInputElement).value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		($("#paid-by") as HTMLSelectElement).value = expense.paidBy;
		($("#split-type") as HTMLSelectElement).value = expense.splitType || "equal";

		// Set checkboxes
		const checkboxes = [...$$("#split-checkboxes input[type=checkbox]")] as HTMLInputElement[];
		checkboxes.forEach((cb) => {
			const checked = expense.splitAmong.includes(cb.value);
			cb.checked = checked;
			const label = cb.closest(".split-label");
			if (label) label.classList.toggle("checked", checked);
		});

		rebuildSplitValues();
		// Fill split values after rebuild
		if (expense.splitValues && expense.splitType !== "equal") {
			setTimeout(() => {
				const inputs = [...$$("#split-values .split-value-input")] as HTMLInputElement[];
				for (const input of inputs) {
					const member = input.dataset.splitMember!;
					if (expense.splitValues![member] !== undefined) {
						input.value = expense.splitValues![member].toString();
					}
				}
				updateSplitTotals();
			}, 0);
		}

		// Update form UI
		const form = $("#add-expense-form") as HTMLFormElement;
		form.classList.add("editing");
		const submitBtn = form.querySelector("button[type=submit]") as HTMLButtonElement;
		submitBtn.textContent = "✏️ Save Changes";
		let cancelBtn = form.querySelector(".btn-cancel-edit") as HTMLButtonElement | null;
		if (!cancelBtn) {
			cancelBtn = document.createElement("button");
			cancelBtn.type = "button";
			cancelBtn.className = "btn btn-cancel-edit";
			cancelBtn.textContent = "Cancel";
			cancelBtn.addEventListener("click", exitEditMode);
			submitBtn.parentElement!.insertBefore(cancelBtn, submitBtn.nextSibling);
		}
		cancelBtn.hidden = false;

		form.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	function exitEditMode() {
		editingExpenseId = null;
		const form = $("#add-expense-form") as HTMLFormElement;
		form.classList.remove("editing");
		const submitBtn = form.querySelector("button[type=submit]") as HTMLButtonElement;
		submitBtn.textContent = "💸 Add Expense";
		const cancelBtn = form.querySelector(".btn-cancel-edit") as HTMLButtonElement | null;
		if (cancelBtn) cancelBtn.hidden = true;

		($("#expense-desc") as HTMLInputElement).value = "";
		($("#expense-amount") as HTMLInputElement).value = "";
		($("#expense-category") as HTMLSelectElement).value = "";
		const now = new Date();
		($("#expense-date") as HTMLInputElement).value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		($("#split-type") as HTMLSelectElement).value = "equal";
		$("#split-values").hidden = true;
		$("#split-values").innerHTML = "";
	}

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
				getState().nameUpdatedAt = Date.now();
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
					clearActiveGroupId();
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
		const memberId = tag.dataset.member!;
		const member = getState().members.find((m) => m.id === memberId);
		if (!member) return;
		showMemberMenu(getState(), member.name, {
			onAvatarChange: (avatar) => {
				const m = getState().members.find((m) => m.id === memberId);
				if (m) {
					m.avatar = avatar;
					m.updatedAt = Date.now();
				}
				rerender();
			},
			onPaymentChange: (payment) => {
				const m = getState().members.find((m) => m.id === memberId);
				if (m) {
					m.payment = payment;
					m.updatedAt = Date.now();
				}
				rerender();
			},
			onRemove: () => {
				removeMember(getState(), memberId);
				rerender();
			},
			onRename: (newName) => {
				renameMember(getState(), memberId, newName);
				rerender();
				showToast(`✏️ Renamed "${member.name}" → "${newName}"`);
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
		rebuildSplitValues();
	});

	// --- Auto-suggest category ---
	const CATEGORY_KEYWORDS: Record<string, string[]> = {
		food: ["lunch", "dinner", "breakfast", "makan", "nasi", "coffee", "kopi", "tea", "restaurant", "cafe", "food", "snack", "burger", "pizza", "sushi", "ramen", "boba", "drink", "beer", "alcohol", "bar", "mamak", "hawker"],
		transport: ["grab", "taxi", "uber", "petrol", "gas", "fuel", "parking", "toll", "bus", "train", "mrt", "lrt", "flight", "airfare", "airport"],
		accommodation: ["hotel", "airbnb", "hostel", "stay", "room", "accommodation", "resort", "booking"],
		shopping: ["shop", "buy", "mall", "store", "clothes", "shoes", "gift", "present", "amazon", "shopee", "lazada"],
		entertainment: ["movie", "cinema", "concert", "ticket", "game", "karaoke", "bowling", "theme park", "museum", "show"],
		utilities: ["wifi", "internet", "electric", "water", "bill", "phone", "mobile", "subscription", "netflix", "spotify"],
	};

	($("#expense-desc") as HTMLInputElement).addEventListener("input", (e) => {
		const desc = (e.target as HTMLInputElement).value.toLowerCase();
		if (!desc) return;
		const catSelect = $("#expense-category") as HTMLSelectElement;
		if (catSelect.value) return;
		for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
			if (keywords.some((kw) => desc.includes(kw))) {
				catSelect.value = category;
				break;
			}
		}
	});

	// --- Expense filters ---
	const filterEls = [$("#filter-category"), document.getElementById("filter-date-from"), document.getElementById("filter-date-to")];
	for (const el of filterEls) {
		if (el) el.addEventListener("change", () => render(getState()));
	}

	// --- Sort toggle ---
	const sortBtn = document.getElementById("filter-sort");
	if (sortBtn) {
		sortBtn.addEventListener("click", () => {
			const isAsc = sortBtn.dataset.sort === "asc";
			sortBtn.dataset.sort = isAsc ? "desc" : "asc";
			sortBtn.textContent = isAsc ? "🔽 Newest" : "🔼 Oldest";
			render(getState());
		});
	}

	// --- Split type change ---
	function rebuildSplitValues() {
		const splitType = ($("#split-type") as HTMLSelectElement).value;
		const splitValuesEl = $("#split-values");
		if (splitType === "equal") {
			splitValuesEl.hidden = true;
			splitValuesEl.innerHTML = "";
		} else {
			const checked = [...$$("#split-checkboxes input:checked")].map((cb) => (cb as HTMLInputElement).value);
			if (!checked.length) {
				splitValuesEl.hidden = true;
				splitValuesEl.innerHTML = "";
				return;
			}
			// Preserve existing values
			const existing: Record<string, string> = {};
			const inputs = [...$$("#split-values .split-value-input")] as HTMLInputElement[];
			for (const input of inputs) {
				if (input.value) existing[input.dataset.splitMember!] = input.value;
			}
			const currency = ($("#expense-currency") as HTMLSelectElement).value;
			const sym = getSymbol(currency);
			const isPercent = splitType === "percent";
			splitValuesEl.hidden = false;
			splitValuesEl.innerHTML = checked
				.map(
					(memberId) => {
						const member = getState().members.find((m) => m.id === memberId);
						const displayName = member?.name || "???";
						return `
				<div class="split-value-row">
					<span class="split-value-name">${displayName}</span>
					${!isPercent ? `<span class="split-value-prefix">${sym}</span>` : ""}
					<input type="number" step="0.01" min="0" class="split-value-input" data-split-member="${memberId}" placeholder="0" value="${existing[memberId] || ""}" />
					${isPercent ? `<span class="split-value-suffix">%</span><span class="split-value-calc" data-calc-member="${memberId}"></span>` : ""}
				</div>`;
					},
				)
				.join("") + `<div class="split-value-total"><span class="split-value-total-label">Total:</span><span class="split-value-total-amount">0${isPercent ? "%" : ` ${sym}`}</span></div>`;
			updateSplitTotals();
		}
	}

	function updateSplitTotals() {
		const splitType = ($("#split-type") as HTMLSelectElement).value;
		if (splitType === "equal") return;
		const inputs = [...$$("#split-values .split-value-input")] as HTMLInputElement[];
		const total = inputs.reduce((sum, el) => sum + (parseFloat(el.value) || 0), 0);
		const currency = ($("#expense-currency") as HTMLSelectElement).value;
		const sym = getSymbol(currency);
		const amount = parseFloat(($("#expense-amount") as HTMLInputElement).value) || 0;
		const isPercent = splitType === "percent";

		const totalEl = document.querySelector(".split-value-total-amount");
		if (totalEl) {
			const target = isPercent ? 100 : amount;
			const isValid = Math.abs(total - target) <= 0.01;
			totalEl.textContent = isPercent ? `${total.toFixed(1)}% / 100%` : `${sym}${total.toFixed(2)} / ${sym}${amount.toFixed(2)}`;
			totalEl.classList.toggle("split-total-valid", isValid);
			totalEl.classList.toggle("split-total-invalid", !isValid && total > 0);
		}

		if (isPercent) {
			for (const input of inputs) {
				const member = input.dataset.splitMember!;
				const pct = parseFloat(input.value) || 0;
				const calcEl = document.querySelector(`[data-calc-member="${member}"]`);
				if (calcEl) calcEl.textContent = amount ? `= ${sym}${((amount * pct) / 100).toFixed(2)}` : "";
			}
		}
	}

	$("#split-type").addEventListener("change", rebuildSplitValues);
	$("#split-values").addEventListener("input", updateSplitTotals);
	($("#expense-amount") as HTMLInputElement).addEventListener("input", updateSplitTotals);

	// --- Update split values when checkboxes change ---
	$("#split-checkboxes").addEventListener("change", () => {
		rebuildSplitValues();
	});

	// --- Add expense ---
	$("#add-expense-form").addEventListener("submit", (e) => {
		e.preventDefault();
		const desc = ($("#expense-desc") as HTMLInputElement).value.trim();
		const amount = parseFloat(($("#expense-amount") as HTMLInputElement).value);
		const paidBy = ($("#paid-by") as HTMLSelectElement).value;
		const currency = ($("#expense-currency") as HTMLSelectElement).value;
		const category = ($("#expense-category") as HTMLSelectElement).value || undefined;
		const dateStr = ($("#expense-date") as HTMLInputElement).value;
		const date = dateStr ? new Date(dateStr).getTime() : undefined;
		const splitType = ($("#split-type") as HTMLSelectElement).value as "equal" | "exact" | "percent";
		const splitAmong = [...$$("#split-checkboxes input:checked")].map((cb) => (cb as HTMLInputElement).value);

		if (!desc || !amount || !paidBy || !splitAmong.length) {
			showDialog({ type: "error", title: "Fill in all fields lah 🫠" });
			return;
		}

		let splitValues: Record<string, number> | undefined;
		if (splitType !== "equal") {
			splitValues = {};
			const inputs = $$("#split-values .split-value-input") as NodeListOf<HTMLInputElement>;
			for (const input of inputs) {
				const member = input.dataset.splitMember!;
				splitValues[member] = parseFloat(input.value) || 0;
			}
			const total = Object.values(splitValues).reduce((a, b) => a + b, 0);
			if (splitType === "percent" && Math.abs(total - 100) > 0.01) {
				showDialog({ type: "error", title: `Percentages must add up to 100% (currently ${total.toFixed(1)}%) 🧮` });
				return;
			}
			if (splitType === "exact" && Math.abs(total - amount) > 0.01) {
				showDialog({ type: "error", title: `Exact amounts must add up to ${amount.toFixed(2)} (currently ${total.toFixed(2)}) 🧮` });
				return;
			}
		}

		if (editingExpenseId) {
			editExpense(getState(), editingExpenseId, { desc, amount, paidBy, splitAmong, splitType, splitValues, currency, category, date });
			exitEditMode();
			rerender();
			showToast(`✏️ Updated: ${desc} (${getSymbol(currency)}${amount.toFixed(2)})`);
		} else {
			addExpense(getState(), { desc, amount, paidBy, splitAmong, splitType, splitValues, currency, category, date });
			($("#expense-desc") as HTMLInputElement).value = "";
			($("#expense-amount") as HTMLInputElement).value = "";
			($("#expense-category") as HTMLSelectElement).value = "";
			const now = new Date();
			($("#expense-date") as HTMLInputElement).value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
			($("#split-type") as HTMLSelectElement).value = "equal";
			$("#split-values").hidden = true;
			$("#split-values").innerHTML = "";
			rerender();
			showToast(`🧧 Added: ${desc} (${getSymbol(currency)}${amount.toFixed(2)})`);
			trackExpenseForInstall();
		}
	});

	// --- Long press on expense → action menu (Edit / Delete) ---
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressItem: HTMLElement | null = null;

	function isExpenseLocked(id: string): boolean {
		const state = getState();
		const activeExpenses = state.expenses.filter((e) => !e.deleted);
		const expense = activeExpenses.find((e) => e.id === id);
		if (!expense) return false;
		if (expense.type === "settlement") return true;
		const cur = expense.currency || "MYR";
		// Locked if any settlement exists after this expense for same currency between involved parties
		for (const exp of activeExpenses) {
			if (exp.type !== "settlement") continue;
			if ((exp.currency || "MYR") !== cur) continue;
			if (exp.createdAt < expense.createdAt) continue;
			// Settlement involves the payer of this expense
			if (exp.splitAmong[0] === expense.paidBy) return true;
		}
		return false;
	}

	function showExpenseActions(item: HTMLElement) {
		const id = item.dataset.expenseId;
		if (!id) return;
		const expense = getState().expenses.find((ex) => ex.id === id);
		if (!expense) return;
		if (navigator.vibrate) navigator.vibrate(30);
		item.classList.remove("long-press-active");

		if (isExpenseLocked(id)) {
			showDialog({ type: "error", title: "This expense is locked — it was settled already 🔒" });
			return;
		}

		showDialog({
			type: "confirm",
			title: `"${expense.desc}" — what do?`,
			onConfirm: () => {
				enterEditMode(id);
			},
			onCancel: () => {},
		});
		// Override dialog buttons for Edit/Delete
		const buttonsEl = document.getElementById("dialog-buttons");
		if (buttonsEl) {
			buttonsEl.innerHTML = `
				<button class="btn dialog-btn-edit">✏️ Edit</button>
				<button class="btn dialog-btn-delete">🗑️ Delete</button>
				<button class="btn dialog-btn-cancel">nvm</button>
			`;
			buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-edit")!.onclick = () => {
				document.getElementById("dialog-modal")!.hidden = true;
				enterEditMode(id);
			};
			buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-delete")!.onclick = () => {
				document.getElementById("dialog-modal")!.hidden = true;
				showDialog({
					type: "confirm",
					title: `Delete "${expense.desc}"? 🗑️`,
					onConfirm: () => {
						deleteExpense(getState(), id);
						rerender();
					},
				});
			};
			buttonsEl.querySelector<HTMLButtonElement>(".dialog-btn-cancel")!.onclick = () => {
				document.getElementById("dialog-modal")!.hidden = true;
			};
		}
	}

	const expensesList = $("#expenses-list");

	expensesList.addEventListener("touchstart", (e) => {
		const item = (e.target as HTMLElement).closest(".expense-item") as HTMLElement | null;
		if (!item || !item.dataset.expenseId) return;
		if (isExpenseLocked(item.dataset.expenseId)) return;
		longPressItem = item;
		item.classList.add("long-press-active");
		longPressTimer = setTimeout(() => {
			showExpenseActions(item);
			longPressTimer = null;
		}, 500);
	}, { passive: true });

	expensesList.addEventListener("touchend", () => {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		if (longPressItem) {
			longPressItem.classList.remove("long-press-active");
			longPressItem = null;
		}
	});

	expensesList.addEventListener("touchmove", () => {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		if (longPressItem) {
			longPressItem.classList.remove("long-press-active");
			longPressItem = null;
		}
	});

	// Desktop: right-click on expense
	expensesList.addEventListener("contextmenu", (e) => {
		const item = (e.target as HTMLElement).closest(".expense-item") as HTMLElement | null;
		if (!item || !item.dataset.expenseId) return;
		e.preventDefault();
		showExpenseActions(item);
	});

	// --- Split details toggle ---
	$("#expenses-list").addEventListener("click", (e) => {
		const badge = (e.target as HTMLElement).closest("[data-split-toggle]") as HTMLElement | null;
		if (!badge) return;
		const item = badge.closest(".expense-item");
		if (!item) return;
		const details = item.querySelector(".split-details") as HTMLElement | null;
		if (details) {
			details.hidden = !details.hidden;
			badge.classList.toggle("split-badge-active", !details.hidden);
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
		e.stopPropagation();
		const fromId = settleBtn.dataset.settleFrom!;
		const toId = settleBtn.dataset.settleTo!;
		const currency = settleBtn.dataset.settleCurrency!;
		const amount = parseFloat(settleBtn.dataset.settleAmount!);
		const pm = getPayment(getState(), toId);
		const sym = getSymbol(currency);
		const fromName = getState().members.find((m) => m.id === fromId)?.name || "???";
		const toName = getState().members.find((m) => m.id === toId)?.name || "???";

		showDialog({
			type: "prompt",
			title: `${fromName} → ${toName}${pm ? `\n💳 Pay via: ${pm}` : ""}\nHow much to settle?`,
			defaultValue: amount.toFixed(2),
			onConfirm: (val) => {
				const settleAmount = parseFloat(val || "0");
				if (!settleAmount || settleAmount <= 0) {
					showDialog({ type: "error", title: "Enter a valid amount lah 🫠" });
					return;
				}
				if (settleAmount > amount + 0.01) {
					showDialog({ type: "error", title: `Cannot settle more than owed (${sym}${amount.toFixed(2)}) 🧮` });
					return;
				}
				addExpense(getState(), {
					type: "settlement",
					desc: `💸 Settlement: ${fromName} → ${toName}`,
					amount: Math.round(settleAmount * 100) / 100,
					paidBy: fromId,
					splitAmong: [toId],
					currency,
				});
				rerender();
				const isPartial = settleAmount < amount - 0.01;
				showToast(isPartial ? `⏳ Partial: ${sym}${settleAmount.toFixed(2)} of ${sym}${amount.toFixed(2)}` : `✅ ${fromName} settled with ${toName}!`);
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

function getPayment(state: GroupState, id: string): string {
	const member = state.members.find((m) => m.id === id);
	return member?.payment || "";
}
