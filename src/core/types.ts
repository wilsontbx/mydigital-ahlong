export interface Currency {
	code: string;
	symbol: string;
}

export interface Member {
	id: string;
	name: string;
	payment: string;
	avatar: string;
	updatedAt: number;
}

export type SplitType = 'equal' | 'exact' | 'percent';
export type ExpenseType = 'expense' | 'settlement';

export interface Expense {
	id: string;
	type: ExpenseType;
	desc: string;
	amount: number;
	paidBy: string;
	splitAmong: string[];
	splitType: SplitType;
	splitValues?: Record<string, number>;
	currency: string;
	category?: string;
	date: number;
	createdAt: number;
	updatedAt: number;
	deleted: boolean;
}

export interface GroupState {
	id: string;
	name: string;
	nameUpdatedAt?: number;
	members: Member[];
	expenses: Expense[];
	createdAt: number;
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
