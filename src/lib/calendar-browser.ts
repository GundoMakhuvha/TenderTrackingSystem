/**
 * Browser-only calendar helpers (opening Outlook, downloading .ics files).
 * Kept apart from calendar.ts, which is shared with the email function.
 */
import { buildIcs, buildOutlookWebUrl, type CalendarEvent, type OutlookAccount } from '@/lib/calendar';

export function openInOutlookWeb(event: CalendarEvent, account: OutlookAccount = 'work') {
  window.open(buildOutlookWebUrl(event, account), '_blank', 'noopener,noreferrer');
}

export function downloadIcs(events: CalendarEvent[], fileName: string, calendarName?: string) {
  if (events.length === 0) return;
  const blob = new Blob([buildIcs(events, calendarName)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.ics') ? fileName : `${fileName}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
