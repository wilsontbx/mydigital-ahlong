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

export function parseExpenseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = typeof (value as Timestamp).toDate === 'function'
    ? (value as Timestamp).toDate()
    : new Date(value as string);
  return isNaN(date.getTime()) ? null : date;
}
