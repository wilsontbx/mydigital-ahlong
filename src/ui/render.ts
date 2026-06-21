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

function formatDate(ts: number): string {
	if (!ts) return "";
	const d = new Date(ts);
	const now = new Date();
	const isToday = d.toDateString() === now.toDateString();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const isYesterday = d.toDateString() === yesterday.toDateString();

	const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

	if (isToday) return `Today ${time}`;
	if (isYesterday) return `Yesterday ${time}`;
	return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + ` ${time}`;
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
}

export function renderExpenses(state: GroupState): void {
	const list = $("#expenses-list");
	const activeExpenses = state.expenses.filter((e) => !e.deleted);
	if (!activeExpenses.length) {
		list.innerHTML = '<p class="empty">🎶 nothing here yet... go spend some money</p>';
		return;
	}
	// Find which expenses are locked (came before a settlement of the same currency)
	const lockedIds = new Set<string>();
	const settledCurrencies = new Set<string>();
	for (let i = activeExpenses.length - 1; i >= 0; i--) {
		const exp = activeExpenses[i];
		const cur = exp.currency || "MYR";
		if (exp.desc.startsWith("💸 Settlement")) {
			settledCurrencies.add(cur);
		}
		if (settledCurrencies.has(cur) && !exp.desc.startsWith("💸 Settlement")) {
			lockedIds.add(exp.id);
		}
	}

	const visible = activeExpenses.filter((e) => !e.desc.startsWith("💸 Settlement"));
	if (!visible.length) {
		list.innerHTML = '<p class="empty">🎶 nothing here yet... go spend some money</p>';
		return;
	}

	list.innerHTML = visible
		.map((e) => {
			const canDelete = !lockedIds.has(e.id);
			return `
    <div class="expense-item">
      <div class="expense-info">
        <strong>${esc(e.desc)}</strong>
        <span class="expense-amount">${getSymbol(e.currency)}${e.amount.toFixed(2)}</span>
      </div>
      <div class="expense-meta">
        Paid by ${getAvatar(state, e.paidBy)} <b>${esc(e.paidBy)}</b> · Split: ${e.splitAmong.map((s) => `${getAvatar(state, s)} ${esc(s)}`).join(", ")}
        <span class="expense-date">${formatDate(e.createdAt)}</span>
      </div>
      ${canDelete ? `<button class="btn-expense-delete" data-remove-expense="${e.id}">Delete</button>` : lockedIds.has(e.id) ? `<span class="expense-locked">🔒 settled</span>` : ""}
    </div>
  `;
		})
		.join("");
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
	const sorted = [...state.expenses].reverse();
	log.innerHTML = sorted
		.map((e) => {
			const sym = getSymbol(e.currency);
			const isSettlement = e.desc.startsWith("💸 Settlement");
			const isDeleted = e.deleted;
			const icon = isDeleted ? "❌" : isSettlement ? "🤝" : "🧾";
			return `
		<div class="txn-item ${isSettlement ? "txn-settlement" : ""} ${isDeleted ? "txn-deleted" : ""}">
			<span class="txn-icon">${icon}</span>
			<div class="txn-details">
				<span class="txn-desc">${esc(e.desc)}</span>
				<span class="txn-meta">${getAvatar(state, e.paidBy)} ${esc(e.paidBy)} · ${formatDate(e.createdAt)}</span>
			</div>
			<span class="txn-amount ${isSettlement ? "txn-amount-settle" : ""}">${sym}${e.amount.toFixed(2)}</span>
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
