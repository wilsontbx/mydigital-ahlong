// --- DOM helpers ---

export function $(sel: string): HTMLElement {
	return document.querySelector(sel)!;
}

export function $$(sel: string): NodeListOf<HTMLElement> {
	return document.querySelectorAll(sel);
}

export function esc(str: string): string {
	const div = document.createElement("div");
	div.textContent = str;
	return div.innerHTML;
}

export function showToast(msg: string): void {
	const toast = $("#toast");
	toast.textContent = msg;
	toast.classList.add("show");
	setTimeout(() => toast.classList.remove("show"), 2500);
}

export function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}
