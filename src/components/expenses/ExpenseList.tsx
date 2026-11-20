import type { Expense, GroupMember } from '@/lib/types';
import ExpenseItem from './ExpenseItem';

interface ExpenseListProps {
  expenses: Expense[];
  members: Record<string, GroupMember>;
  currency: string;
  currentUserId?: string;
}

export default function ExpenseList({ expenses, members, currency, currentUserId }: ExpenseListProps) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {expenses.map((expense) => (
        <ExpenseItem
          key={expense.id}
          expense={expense}
          members={members}
          currency={currency}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
