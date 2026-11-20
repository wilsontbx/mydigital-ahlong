import { format, formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export function formatDate(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return format(date, 'dd MMM yyyy');
}

export function formatDateTime(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return format(date, 'dd MMM yyyy, h:mm a');
}

export function timeAgo(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getExpenseDates(expense: { dates?: string[]; date?: unknown }): string[] {
  if (expense.dates && expense.dates.length > 0) return expense.dates;
  // Legacy: single date field (Timestamp or string)
  const val = expense.date;
  if (!val) return [];
  const d = typeof (val as Timestamp).toDate === 'function'
    ? (val as Timestamp).toDate()
    : new Date(val as string);
  if (isNaN(d.getTime())) return [];
  return [format(d, 'yyyy-MM-dd')];
}
