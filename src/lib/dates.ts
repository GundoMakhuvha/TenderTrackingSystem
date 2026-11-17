import { differenceInCalendarDays } from 'date-fns';

/** Human countdown like 'Tomorrow' or 'In 5 days', with an urgency tone. */
export function countdownLabel(target: Date, now = new Date()) {
  const days = differenceInCalendarDays(target, now);
  if (days === 0) return { text: 'Today', tone: 'urgent' as const };
  if (days === 1) return { text: 'Tomorrow', tone: 'urgent' as const };
  if (days < 0) return { text: `${Math.abs(days)} day${days === -1 ? '' : 's'} ago`, tone: 'past' as const };
  if (days <= 7) return { text: `In ${days} days`, tone: 'soon' as const };
  return { text: `In ${days} days`, tone: 'later' as const };
}
