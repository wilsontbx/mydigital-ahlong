import type { GroupState } from "../core/types";
import { $, esc } from "../shared/utils";
import { CURRENCIES, loadGroups, getActiveIndex, loadPaymentMethods, loadAvatars } from "../core/state";
import { simplifyDebts } from "../core/expenses";

// --- Helpers ---

function getSymbol(code: string): string {
	if (!code) return "";
	const c = CURRENCIES.find((c) => c.code === code);
	return c ? c.symbol : code;
}

function getAvatar(name: string): string {
	const avatars = loadAvatars();
	return avatars[name] || "😀";
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

// --- I am ---

const IAM_KEY = "mydigital-ahlong_iam";

export function getIam(): string {
	return localStorage.getItem(IAM_KEY) || "";
}

export function setIam(name: string): void {
	localStorage.setItem(IAM_KEY, name);
}

// --- Render functions ---

export { getSymbol };

export function renderGroupSwitcher(_state: GroupState): void {
	const groups = loadGroups();
	const activeIdx = getActiveIndex();
	const container = $("#group-tabs");
	container.innerHTML =
		groups.map((g, i) => `<button class="group-tab ${i === activeIdx ? "active" : ""}" data-group-idx="${i}">${esc(g.name)}</button>`).join("") +
		`<button class="group-tab group-tab-new" id="new-group-btn">+</button>`;
}

export function renderGroup(state: GroupState): void {
	$("#group-name").textContent = state.name;
}

export function renderIam(state: GroupState): void {
	const sel = $("#iam-select");
	const current = getIam();
	sel.innerHTML =
		`<option value="" disabled ${!current ? "selected" : ""}>who dis?</option>` +
		state.members.map((m) => `<option value="${esc(m)}" ${m === current ? "selected" : ""}>${esc(m)}</option>`).join("");
}

export function renderMembers(state: GroupState): void {
	const list = $("#members-list");
	const payments = loadPaymentMethods();
	list.innerHTML = state.members
		.map(
			(m) => `
    <span class="member-tag" data-member="${esc(m)}">
      <span class="member-avatar">${getAvatar(m)}</span> ${esc(m)} ${payments[m] ? "💳" : ""}
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
      <input type="checkbox" value="${esc(m)}" checked>
      <span class="split-avatar">${getAvatar(m)}</span>
      <span class="split-name">${esc(m)}</span>
    </label>
  `,
			)
			.join("");

	const select = $("#paid-by");
	const iam = getIam();
	select.innerHTML = state.members.map((m) => `<option value="${esc(m)}" ${m === iam ? "selected" : ""}>${esc(m)}</option>`).join("");

	const currSel = $("#expense-currency");
	currSel.innerHTML = getOrderedCurrencies()
		.map((c) => `<option value="${c.code}">${c.symbol} ${c.code}</option>`)
		.join("");
}

export function renderExpenses(state: GroupState): void {
	const list = $("#expenses-list");
	if (!state.expenses.length) {
		list.innerHTML = '<p class="empty">🎶 nothing here yet... go spend some money</p>';
		return;
	}
	const iam = getIam();

	// Find which expenses are locked (came before a settlement of the same currency)
	const lockedIds = new Set<string>();
	const settledCurrencies = new Set<string>();
	for (let i = state.expenses.length - 1; i >= 0; i--) {
		const exp = state.expenses[i];
		const cur = exp.currency || "MYR";
		if (exp.desc.startsWith("💸 Settlement")) {
			settledCurrencies.add(cur);
		}
		if (settledCurrencies.has(cur) && !exp.desc.startsWith("💸 Settlement") && !exp.desc.startsWith("❌ Deleted")) {
			lockedIds.add(exp.id);
		}
	}

	const visible = state.expenses.filter((e) => !e.desc.startsWith("❌ Deleted") && !e.desc.startsWith("💸 Settlement"));
	if (!visible.length) {
		list.innerHTML = '<p class="empty">🎶 nothing here yet... go spend some money</p>';
		return;
	}

	list.innerHTML = visible
		.map((e) => {
			const canDelete = !lockedIds.has(e.id) && (e.addedBy === iam || !e.addedBy);
			return `
    <div class="expense-item">
      <div class="expense-info">
        <strong>${esc(e.desc)}</strong>
        <span class="expense-amount">${getSymbol(e.currency)}${e.amount.toFixed(2)}</span>
      </div>
      <div class="expense-meta">
        Paid by ${getAvatar(e.paidBy)} <b>${esc(e.paidBy)}</b> · Split: ${e.splitAmong.map((s) => `${getAvatar(s)} ${esc(s)}`).join(", ")}
        <span class="expense-date">${e.date}${e.time ? " " + e.time : ""}</span>
      </div>
      ${canDelete ? `<button class="btn-expense-delete" data-remove-expense="${e.id}">Delete</button>` : lockedIds.has(e.id) ? `<span class="expense-locked">🔒 settled</span>` : ""}
    </div>
  `;
		})
		.join("");
}

export function renderSettlement(state: GroupState): void {
	const container = $("#settlement");
	if (!state.expenses.length) {
		container.innerHTML = '<p class="empty">add some expenses first lah 🫠</p>';
		return;
	}

	const activeExpenses = state.expenses.filter((e) => e.amount > 0 && e.splitAmong.length > 0);
	const byCurrency: Record<string, typeof state.expenses> = {};
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
				const pm = loadPaymentMethods()[d.to] || "";
				return `
      <div class="debt-item" data-debt-from="${esc(d.from)}" data-debt-to="${esc(d.to)}" data-debt-amount="${sym}${d.amount.toFixed(2)}" data-debt-currency="${currency}" data-debt-raw="${d.amount.toFixed(2)}">
        <span class="debt-text">${getAvatar(d.from)} <b>${esc(d.from)}</b> owes ${getAvatar(d.to)} <b>${esc(d.to)}</b></span>
        <span class="debt-amount">${sym}${d.amount.toFixed(2)}</span>
        ${pm ? `<span class="debt-payment">💳 ${esc(pm)}</span>` : ""}
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
			const isDeleted = e.desc.startsWith("❌ Deleted");
			const icon = isDeleted ? "❌" : isSettlement ? "🤝" : "🧾";
			return `
		<div class="txn-item ${isSettlement ? "txn-settlement" : ""} ${isDeleted ? "txn-deleted" : ""}">
			<span class="txn-icon">${icon}</span>
			<div class="txn-details">
				<span class="txn-desc">${esc(e.desc)}</span>
				<span class="txn-meta">${getAvatar(e.paidBy)} ${esc(e.paidBy)} · ${e.date}${e.time ? " " + e.time : ""}${e.addedBy ? ` · by ${getAvatar(e.addedBy)} ${esc(e.addedBy)}` : ""}</span>
			</div>
			<span class="txn-amount ${isSettlement ? "txn-amount-settle" : ""}">${sym}${(isDeleted && e.originalAmount ? e.originalAmount : e.amount || 0).toFixed(2)}</span>
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
	const groups = loadGroups();
	const landing = $("#landing-page") as HTMLElement;
	const appContent = $("#app-content") as HTMLElement;
	if (!groups.length) {
		landing.hidden = false;
		appContent.hidden = true;
		window.history.replaceState(null, "", window.location.pathname);
	} else {
		landing.hidden = true;
		appContent.hidden = false;
	}
}

export function render(state: GroupState): void {
	const groups = loadGroups();
	renderLanding();
	if (!groups.length) return;
	renderGroupSwitcher(state);
	renderGroup(state);
	renderIam(state);
	renderMembers(state);
	renderExpenseForm(state);
	renderExpenses(state);
	renderSettlement(state);
	renderTxnLog(state);
	renderCurrencyPref();
}
