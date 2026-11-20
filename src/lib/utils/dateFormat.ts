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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateShort(dates: string[]): string {
  if (dates.length === 0) return '';

  const parsed = dates
    .map((d) => {
      const [, m, day] = d.split('-');
      return { month: parseInt(m, 10), day: parseInt(day, 10) };
    })
    .sort((a, b) => a.month - b.month || a.day - b.day);

  // Group by month
  const byMonth: Record<number, number[]> = {};
  parsed.forEach(({ month, day }) => {
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(day);
  });

  const parts: string[] = [];
  for (const [month, days] of Object.entries(byMonth)) {
    const mon = MONTHS[parseInt(month, 10) - 1];
    // Collapse consecutive days into ranges
    const ranges: string[] = [];
    let start = days[0];
    let end = days[0];
    for (let i = 1; i < days.length; i++) {
      if (days[i] === end + 1) {
        end = days[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = days[i];
        end = days[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    parts.push(`${ranges.join(', ')} ${mon}`);
  }

  return parts.join(', ');
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
