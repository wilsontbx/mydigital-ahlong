export interface Currency {
	code: string;
	symbol: string;
}

export interface Expense {
	id: string;
	desc: string;
	amount: number;
	paidBy: string;
	splitAmong: string[];
	currency: string;
	addedBy: string;
	date: string;
	time: string;
	originalAmount?: number;
}

export interface GroupState {
	id: string;
	name: string;
	members: string[];
	expenses: Expense[];
	updatedAt: number;
}

export interface Debt {
	from: string;
	to: string;
	amount: number;
}

export interface DialogOptions {
	type?: "error" | "confirm" | "prompt" | "success";
	title: string;
	defaultValue?: string;
	onConfirm?: (val?: string) => void;
	onCancel?: () => void;
	allowEmpty?: boolean;
	onRandomize?: () => string;
}
