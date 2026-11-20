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
