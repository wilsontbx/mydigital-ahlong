import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  groupIds: string[];
}

export interface GroupMember {
  displayName: string;
  email: string;
}

export interface Group {
  id?: string;
  name: string;
  description: string;
  category: 'travel' | 'household' | 'couple' | 'other';
  currency: string;
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  memberIds: string[];
  members: Record<string, GroupMember>;
  inviteCode: string;
  exchangeRates: Record<string, number>;
  balances: Record<string, Record<string, number>>;
  totalExpenses: number;
}

export type SplitType = 'equal' | 'exact' | 'percentage';

export type PaymentMethod = 'cash' | 'card' | 'ewallet' | 'transfer' | 'other';

export type ExpenseType = 'expense' | 'prepaid';

export interface Expense {
  id?: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  baseCurrencyAmount: number;
  category: string;
  expenseType?: ExpenseType;
  paymentMethod?: PaymentMethod;
  paidBy: string;
  splitType: SplitType;
  splits: Record<string, number>;
  participants: string[];
  date?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}


export interface Invite {
  groupId: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number;
}
