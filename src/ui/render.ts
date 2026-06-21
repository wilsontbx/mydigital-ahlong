import type { GroupState } from "../core/types";
import { $, esc } from "../shared/utils";
import { CURRENCIES, getMyGroupIds, getCachedGroup, getActiveGroupId } from "../core/state";
import { simplifyDebts } from "../core/expenses";

// --- Helpers ---

function getSymbol(code: string): string {
	if (!code) return "";
	const c = CURRENCIES.find((c) => c.code === code);
	return c ? c.symbol : code;
}

function getAvatar(state: GroupState, name: string): string {
	const member = state.members.find((m) => m.name === name);
	return member?.avatar || "😀";
}

function getPayment(state: GroupState, name: string): string {
	const member = state.members.find((m) => m.name === name);
	return member?.payment || "";
}

function formatDate(ts: number, includeTime = true): string {
	if (!ts) return "";
	const d = new Date(ts);
	const now = new Date();
	const isToday = d.toDateString() === now.toDateString();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const isYesterday = d.toDateString() === yesterday.toDateString();

	const diffMs = now.getTime() - d.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	const time = includeTime ? " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";

	if (isToday) return `Today${time}`;
	if (isYesterday) return `Yesterday${time}`;
	if (diffDays < 7) return `${diffDays} days ago${time}`;
	return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + time;
}

// --- Currency order (local) ---

const CURRENCY_KEY = "mydigital-ahlong_currency_order";

function getCurrencyOrder(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(CURRENCY_KEY) || "null");
		if (Array.isArray(stored) && stored.length === CURRENCIES.length) return stored;
	} catch {
		/* ignore */
	}
	return CURRENCIES.map((c) => c.code);
}

export function setCurrencyOrder(order: string[]): void {
	localStorage.setItem(CURRENCY_KEY, JSON.stringify(order));
}

export function getOrderedCurrencies() {
	const order = getCurrencyOrder();
	return order.map((code) => CURRENCIES.find((c) => c.code === code)).filter(Boolean) as typeof CURRENCIES;
}


// --- Render functions ---

export { getSymbol };

export function renderGroupSwitcher(_state: GroupState): void {
	const groupIds = getMyGroupIds();
	const activeId = getActiveGroupId();
	const container = $("#group-tabs");

	const tabs = groupIds.map((id) => {
		const cached = getCachedGroup(id);
		const name = cached?.name || "...";
		const isActive = id === activeId;
		return `<button class="group-tab ${isActive ? "active" : ""}" data-group-id="${id}">${esc(name)}</button>`;
	});

	container.innerHTML = tabs.join("") + `<button class="group-tab group-tab-new" id="new-group-btn">+</button>`;
}

export function renderGroup(state: GroupState): void {
	$("#group-name").textContent = state.name;
}


export function renderMembers(state: GroupState): void {
	const list = $("#members-list");
	list.innerHTML = state.members
		.map(
			(m) => `
    <span class="member-tag" data-member="${esc(m.name)}">
      <span class="member-avatar">${m.avatar}</span> ${esc(m.name)} ${m.payment ? "💳" : ""}
    </span>
  `,
		)
		.join("");
}

export function renderExpenseForm(state: GroupState): void {
	const container = $("#split-checkboxes");
	container.innerHTML =
		(state.members.length > 2
			? `<button type="button" class="split-toggle" data-action="all">all</button><button type="button" class="split-toggle" data-action="none">none</button>`
			: "") +
		state.members
			.map(
				(m) => `
    <label class="split-label checked">
      <input type="checkbox" value="${esc(m.name)}" checked>
      <span class="split-avatar">${m.avatar}</span>
      <span class="split-name">${esc(m.name)}</span>
    </label>
  `,
			)
			.join("");

	const select = $("#paid-by");
	select.innerHTML = state.members.map((m) => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join("");

	const currSel = $("#expense-currency");
	currSel.innerHTML = getOrderedCurrencies()
		.map((c) => `<option value="${c.code}">${c.symbol} ${c.code}</option>`)
		.join("");

	const now = new Date();
	const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	const dateInput = $("#expense-date") as HTMLInputElement;
	if (dateInput) {
		dateInput.max = today;
		if (!dateInput.value) dateInput.value = today;
	}
	const filterFrom = document.getElementById("filter-date-from") as HTMLInputElement | null;
	const filterTo = document.getElementById("filter-date-to") as HTMLInputElement | null;
	if (filterFrom) filterFrom.max = today;
	if (filterTo) filterTo.max = today;
}

const CATEGORY_ICONS: Record<string, string> = {
	food: "🍔",
	transport: "🚗",
	accommodation: "🏨",
	shopping: "🛍️",
	entertainment: "🎬",
	utilities: "💡",
	other: "📦",
};

export function renderExpenses(state: GroupState): void {
	const list = $("#expenses-list");
	const activeExpenses = state.expenses.filter((e) => !e.deleted);
	if (!activeExpenses.length) {
		list.innerHTML = '<p class="empty">🎶 nothing here yet... go spend some money</p>';
		renderCategoryBreakdown([]);
		return;
	}
	// Find which expenses are locked (came before a settlement of the same currency)
	const lockedIds = new Set<string>();
	const settledCurrencies = new Set<string>();
	for (let i = activeExpenses.length - 1; i >= 0; i--) {
		const exp = activeExpenses[i];
		const cur = exp.currency || "MYR";
		if (exp.type === "settlement") {
			settledCurrencies.add(cur);
		}
		if (settledCurrencies.has(cur) && exp.type !== "settlement") {
			lockedIds.add(exp.id);
		}
	}

	const visible = activeExpenses.filter((e) => e.type !== "settlement");

	// Apply filters
	const filterCat = (document.getElementById("filter-category") as HTMLSelectElement | null)?.value || "";
	const filterFrom = (document.getElementById("filter-date-from") as HTMLInputElement | null)?.value || "";
	const filterTo = (document.getElementById("filter-date-to") as HTMLInputElement | null)?.value || "";

	const filtered = visible.filter((e) => {
		if (filterCat) {
			if (filterCat === "uncategorized") {
				if (e.category) return false;
			} else if (e.category !== filterCat) return false;
		}
		const expDate = e.date || e.createdAt;
		if (filterFrom && expDate < new Date(filterFrom).getTime()) return false;
		if (filterTo && expDate > new Date(filterTo).getTime() + 86400000) return false;
		return true;
	});

	// Sort by date, then createdAt as tiebreaker for same date
	const sortBtn = document.getElementById("filter-sort");
	const sortAsc = sortBtn?.dataset.sort === "asc";
	filtered.sort((a, b) => {
		const dateA = a.date || a.createdAt;
		const dateB = b.date || b.createdAt;
		if (dateA !== dateB) return sortAsc ? dateA - dateB : dateB - dateA;
		return sortAsc ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
	});

	renderCategoryBreakdown(filtered);

	if (!filtered.length) {
		list.innerHTML = '<p class="empty">no expenses match your filters 🔍</p>';
		return;
	}

	// Track settlements: accumulate how much each person has settled to another per currency
	// Only count settlements that came AFTER an expense to determine that expense's status
	const settlementsByTime: { from: string; to: string; currency: string; amount: number; createdAt: number }[] = [];
	for (const exp of activeExpenses) {
		if (exp.type !== "settlement") continue;
		settlementsByTime.push({ from: exp.paidBy, to: exp.splitAmong[0], currency: exp.currency || "MYR", amount: exp.amount, createdAt: exp.createdAt });
	}

	list.innerHTML = filtered
		.map((e) => {
			const catIcon = e.category ? CATEGORY_ICONS[e.category] || "" : "";
			const displayDate = e.date ? formatDate(e.date, false) : formatDate(e.createdAt, false);
			const splitType = e.splitType || "equal";
			const sym = getSymbol(e.currency);
			const cur = e.currency || "MYR";

			// Calculate per-member owed amounts and how much they've settled AFTER this expense
			const memberOwed: { name: string; owed: number; paid: number }[] = [];
			for (const s of e.splitAmong) {
				if (s === e.paidBy) continue;
				let owed = 0;
				if (splitType === "equal") {
					owed = e.amount / e.splitAmong.length;
				} else if (splitType === "exact" && e.splitValues) {
					owed = e.splitValues[s] || 0;
				} else if (splitType === "percent" && e.splitValues) {
					owed = (e.amount * (e.splitValues[s] || 0)) / 100;
				}
				// Sum settlements from this person to payer, same currency, created after this expense
				const paid = settlementsByTime
					.filter((st) => st.from === s && st.to === e.paidBy && st.currency === cur && st.createdAt >= e.createdAt)
					.reduce((sum, st) => sum + st.amount, 0);
				memberOwed.push({ name: s, owed, paid: Math.min(paid, owed) });
			}
			const totalOwed = memberOwed.reduce((sum, m) => sum + m.owed, 0);
			const totalPaid = memberOwed.reduce((sum, m) => sum + m.paid, 0);
			const isFullySettled = totalOwed > 0 && Math.abs(totalPaid - totalOwed) < 0.01;
			const isPartial = totalPaid > 0.01 && !isFullySettled;

			let statusHtml = "";
			if (totalOwed > 0) {
				const pct = Math.min((totalPaid / totalOwed) * 100, 100);
				const statusClass = isFullySettled ? "settle-full" : isPartial ? "settle-partial" : "settle-pending";
				const statusLabel = isFullySettled ? "✅ Settled" : isPartial ? `⏳ ${sym}${totalPaid.toFixed(2)} / ${sym}${totalOwed.toFixed(2)}` : `💤 ${sym}${totalOwed.toFixed(2)} owed`;
				const unpaid = memberOwed.filter((m) => m.paid < m.owed - 0.01);
				const unpaidText = unpaid.length && !isFullySettled ? ` · ${unpaid.map((m) => `${getAvatar(state, m.name)} ${esc(m.name)}`).join(", ")} unpaid` : "";
				statusHtml = `<div class="expense-settle-status ${statusClass}">
					<div class="settle-bar"><div class="settle-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
					<span class="settle-label">${statusLabel}${unpaidText}</span>
				</div>`;
			}

			let splitDetails: string[] = [];
			if (splitType === "equal") {
				const share = e.amount / e.splitAmong.length;
				splitDetails = e.splitAmong.map((s) => {
					const m = memberOwed.find((x) => x.name === s);
					const paidTag = m ? (m.paid >= m.owed - 0.01 ? " ✅" : m.paid > 0 ? ` (paid ${sym}${m.paid.toFixed(2)})` : "") : "";
					return `<span class="split-detail-item">${getAvatar(state, s)} ${esc(s)}: <b>${sym}${share.toFixed(2)}</b>${paidTag}</span>`;
				});
			} else if (splitType === "exact" && e.splitValues) {
				splitDetails = e.splitAmong.map((s) => {
					const m = memberOwed.find((x) => x.name === s);
					const paidTag = m ? (m.paid >= m.owed - 0.01 ? " ✅" : m.paid > 0 ? ` (paid ${sym}${m.paid.toFixed(2)})` : "") : "";
					return `<span class="split-detail-item">${getAvatar(state, s)} ${esc(s)}: <b>${sym}${(e.splitValues![s] || 0).toFixed(2)}</b>${paidTag}</span>`;
				});
			} else if (splitType === "percent" && e.splitValues) {
				splitDetails = e.splitAmong.map((s) => {
					const m = memberOwed.find((x) => x.name === s);
					const paidTag = m ? (m.paid >= m.owed - 0.01 ? " ✅" : m.paid > 0 ? ` (paid ${sym}${m.paid.toFixed(2)})` : "") : "";
					return `<span class="split-detail-item">${getAvatar(state, s)} ${esc(s)}: <b>${(e.splitValues![s] || 0).toFixed(1)}%</b> (${sym}${((e.amount * (e.splitValues![s] || 0)) / 100).toFixed(2)})${paidTag}</span>`;
				});
			}
			const badgeClass = splitType === "equal" ? "split-type-badge split-type-equal" : "split-type-badge";

			return `
    <div class="expense-item" data-expense-id="${e.id}">
      <div class="expense-info">
        <strong>${catIcon ? catIcon + " " : ""}${esc(e.desc)}</strong>
        <span class="expense-amount">${sym}${e.amount.toFixed(2)}</span>
      </div>
      <div class="expense-meta">
        Paid by ${getAvatar(state, e.paidBy)} <b>${esc(e.paidBy)}</b> · <span class="${badgeClass}" data-split-toggle>${splitType}</span> among ${e.splitAmong.map((s) => `${getAvatar(state, s)}`).join(" ")}
        <span class="expense-date">${displayDate}</span>
      </div>
      ${statusHtml}
      <div class="split-details" hidden>${splitDetails.join("")}</div>
    </div>
  `;
		})
		.join("");
}

function renderCategoryBreakdown(expenses: { amount: number; currency: string; category?: string }[]): void {
	const container = document.getElementById("category-breakdown");
	if (!container) return;
	if (!expenses.length) {
		container.innerHTML = "";
		return;
	}
	const totals: Record<string, Record<string, number>> = {};
	for (const e of expenses) {
		const cat = e.category || "uncategorized";
		if (!totals[cat]) totals[cat] = {};
		const cur = e.currency || "MYR";
		totals[cat][cur] = (totals[cat][cur] || 0) + e.amount;
	}
	const pills = Object.entries(totals)
		.sort(([, a], [, b]) => Object.values(b).reduce((s, v) => s + v, 0) - Object.values(a).reduce((s, v) => s + v, 0))
		.map(([cat, currencies]) => {
			const icon = CATEGORY_ICONS[cat] || "🏷️";
			const amounts = Object.entries(currencies)
				.map(([cur, amt]) => `${getSymbol(cur)}${amt.toFixed(2)}`)
				.join(" + ");
			return `<span class="cat-pill">${icon} ${cat} <span class="cat-pill-amount">${amounts}</span></span>`;
		})
		.join("");
	container.innerHTML = pills;
}

export function renderSettlement(state: GroupState): void {
	const container = $("#settlement");
	const activeExpenses = state.expenses.filter((e) => !e.deleted);
	if (!activeExpenses.length) {
		container.innerHTML = '<p class="empty">add some expenses first lah 🫠</p>';
		return;
	}

	const byCurrency: Record<string, typeof activeExpenses> = {};
	for (const e of activeExpenses) {
		const cur = e.currency || "MYR";
		if (!byCurrency[cur]) byCurrency[cur] = [];
		byCurrency[cur].push(e);
	}

	let html = "";
	for (const [currency, expenses] of Object.entries(byCurrency)) {
		const debts = simplifyDebts(expenses, state.members);
		if (!debts.length) continue;
		const sym = getSymbol(currency);
		html += `<div class="settlement-group">`;
		html += `<h4>${sym} ${currency}</h4>`;
		html += debts
			.map((d) => {
				const pm = getPayment(state, d.to);
				return `
      <div class="debt-item" data-debt-from="${esc(d.from)}" data-debt-to="${esc(d.to)}" data-debt-amount="${sym}${d.amount.toFixed(2)}" data-debt-currency="${currency}" data-debt-raw="${d.amount.toFixed(2)}">
        <div class="debt-info">
          <span class="debt-text">${getAvatar(state, d.from)} <b>${esc(d.from)}</b> owes ${getAvatar(state, d.to)} <b>${esc(d.to)}</b></span>
          ${pm ? `<span class="debt-payment">💳 ${esc(pm)}</span>` : ""}
        </div>
        <div class="debt-actions">
          <span class="debt-amount">${sym}${d.amount.toFixed(2)}</span>
          <button class="btn-settle" data-settle-from="${esc(d.from)}" data-settle-to="${esc(d.to)}" data-settle-currency="${currency}" data-settle-amount="${d.amount.toFixed(2)}">✅ Settle</button>
        </div>
      </div>
    `;
			})
			.join("");
		html += `</div>`;
	}

	container.innerHTML =
		html ||
		`<div class="settled-party">
			<div class="settled-emojis">🎉🥳🎊</div>
			<p class="settled-msg">ALL SETTLED BABYYYY</p>
			<p class="settled-sub">no debts, no beef, just vibes ✌️</p>
			<div class="confetti"></div>
		</div>`;
}

export function renderTxnLog(state: GroupState): void {
	const log = $("#txn-log");
	if (!state.expenses.length) {
		log.innerHTML = '<p class="empty">no transactions yet</p>';
		return;
	}
	// Build log entries: original + edit entries for edited expenses
	type LogEntry = { desc: string; amount: number; currency: string; paidBy: string; createdAt: number; deleted: boolean; isSettlement: boolean; isEdit: boolean };
	const entries: LogEntry[] = [];
	for (const e of state.expenses) {
		const isSettlement = e.type === "settlement";
		entries.push({ desc: e.desc, amount: e.amount, currency: e.currency, paidBy: e.paidBy, createdAt: e.createdAt, deleted: e.deleted, isSettlement, isEdit: false });
		const isEdited = e.updatedAt && e.updatedAt > e.createdAt + 1000;
		if (isEdited && !e.deleted) {
			entries.push({ desc: `Edited: ${e.desc}`, amount: e.amount, currency: e.currency, paidBy: e.paidBy, createdAt: e.updatedAt, deleted: false, isSettlement: false, isEdit: true });
		}
	}
	entries.sort((a, b) => b.createdAt - a.createdAt);

	log.innerHTML = entries
		.map((e) => {
			const sym = getSymbol(e.currency);
			const icon = e.deleted ? "❌" : e.isEdit ? "✏️" : e.isSettlement ? "🤝" : "🧾";
			return `
		<div class="txn-item ${e.isSettlement ? "txn-settlement" : ""} ${e.deleted ? "txn-deleted" : ""} ${e.isEdit ? "txn-edited" : ""}">
			<span class="txn-icon">${icon}</span>
			<div class="txn-details">
				<span class="txn-desc">${esc(e.desc)}</span>
				<span class="txn-meta">${getAvatar(state, e.paidBy)} ${esc(e.paidBy)} · ${formatDate(e.createdAt)}</span>
			</div>
			<span class="txn-amount ${e.isSettlement ? "txn-amount-settle" : ""}">${sym}${e.amount.toFixed(2)}</span>
		</div>`;
		})
		.join("");
}

export function renderCurrencyPref(): void {
	const container = $("#currency-pills");
	const ordered = getOrderedCurrencies();
	container.innerHTML = ordered.map((c, i) => `<button class="currency-pill ${i === 0 ? "active" : ""}" data-currency="${c.code}" draggable="true">${c.symbol} ${c.code}</button>`).join("");
}

// --- Main render orchestrator ---

export function renderLanding(): void {
	const landing = $("#landing-page") as HTMLElement;
	const appContent = $("#app-content") as HTMLElement;
	landing.hidden = false;
	appContent.hidden = true;
}

export function render(state: GroupState): void {
	const landing = $("#landing-page") as HTMLElement;
	const appContent = $("#app-content") as HTMLElement;
	landing.hidden = true;
	appContent.hidden = false;

	renderGroupSwitcher(state);
	renderGroup(state);
	renderMembers(state);
	renderExpenseForm(state);
	renderExpenses(state);
	renderSettlement(state);
	renderTxnLog(state);
	renderCurrencyPref();
}
