/**
 * Calendar helpers: turn tender dates (briefings, internal completion dates,
 * submission deadlines) into Outlook calendar entries.
 *
 * Two delivery routes are supported:
 *  1. Outlook on the web deep links (Microsoft 365 work/school accounts and
 *     personal Outlook.com accounts) — opens a pre-filled "new event" form.
 *  2. iCalendar (.ics) files — open directly in Outlook desktop (Windows/Mac),
 *     and can be imported into any calendar. Supports bulk export.
 *
 * Every event has a stable UID (tender id + date type), so importing the same
 * .ics again updates the existing Outlook entry instead of duplicating it.
 */
import { format } from 'date-fns';
import type { Tender, TenderRequirements } from '@/types/tender';

export type CalendarEventKind = 'briefing' | 'internal_completion' | 'submission_deadline';

export interface CalendarEvent {
  uid: string;
  kind: CalendarEventKind;
  tenderId: string;
  title: string;
  /** Structured plain-text body (Outlook web, standard .ics). */
  description: string;
  /** Formatted HTML body, shown by Outlook desktop when importing .ics. */
  htmlDescription?: string;
  /** Compact HTML for Outlook on the web links (kept short to fit in a URL). */
  webDescription?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  /** Minutes before start to show an Outlook reminder. */
  reminderMinutes: number;
}

export type OutlookAccount = 'work' | 'personal';

export const eventKindLabels: Record<CalendarEventKind, string> = {
  briefing: 'Briefing session',
  internal_completion: 'Internal completion',
  submission_deadline: 'Submission deadline',
};

/** South Africa has no daylight saving, so a fixed offset is reliable. */
const APP_UTC_OFFSET: string = import.meta.env.VITE_APP_UTC_OFFSET || '+02:00';
const DEFAULT_BRIEFING_TIME = '10:00';
const BRIEFING_DURATION_MIN = 60;
const DEADLINE_BLOCK_MIN = 60;
const UID_DOMAIN = 'tender-tracker.tippfocus.co.za';

type TenderLike = Pick<
  Tender,
  | 'id'
  | 'tender_reference'
  | 'title'
  | 'client_name'
  | 'submission_deadline'
  | 'assigned_lead_name'
  | 'assigned_lead_email'
  | 'briefing_date'
  | 'briefing_time'
  | 'briefing_compulsory'
  | 'internal_completion_date'
  | 'submission_type'
> &
  Partial<Pick<Tender, 'department' | 'category'>> & {
    tender_requirements?: TenderRequirements | null;
  };

const pad = (n: number) => String(n).padStart(2, '0');

/** Parse a 'YYYY-MM-DD' date + optional 'HH:mm[:ss]' time as business-local time. */
export function parseBusinessDateTime(date: string, time?: string | null): Date {
  const t = (time || DEFAULT_BRIEFING_TIME).slice(0, 5);
  return new Date(`${date.slice(0, 10)}T${t}:00${APP_UTC_OFFSET}`);
}

/** 'YYYY-MM-DD' → Date at local midnight, used for all-day events. */
function parseDateOnly(date: string): Date {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000);
}

function addDaysLocal(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

function tenderUrl(tenderId: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/tenders/${tenderId}`;
}

/* ------------------------------------------------------------------ */
/* Structured invite body                                              */
/* ------------------------------------------------------------------ */

const fmtDateTime = (d: Date) => format(d, 'EEE dd MMM yyyy, HH:mm');
const fmtDate = (d: Date) => format(d, 'EEE dd MMM yyyy');

/** Checklist items that are required but not yet done. */
export function outstandingRequirements(req: TenderRequirements | null | undefined): string[] {
  if (!req) return [];
  const items: string[] = [];
  if (req.quote_required && req.quote_status !== 'finalised') items.push('Quote');
  if (req.reference_letters_required && req.reference_letters_status !== 'compiled') items.push('Reference letters');
  if (req.accreditation_required && req.accreditation_status !== 'compiled') items.push('Accreditation');
  if (req.cvs_required && req.cvs_status !== 'compiled') items.push('CVs');
  if (req.jv_required && req.jv_status !== 'compiled') items.push('JV documents');
  if (req.project_plans_required && req.project_plans_status !== 'compiled') items.push('Project plans');
  if (req.technical_response_status !== 'compiled') items.push('Technical response');
  if (!req.pricing_finalised) items.push('Pricing');
  return items;
}

interface TimelineItem {
  label: string;
  value: string;
  current: boolean;
}

interface InviteModel {
  kind: CalendarEventKind;
  kindLabel: string;
  compulsory: boolean;
  reference: string;
  title: string;
  /** When this event happens, human readable. */
  when: string;
  /** Big date shown in the HTML hero block. */
  hero: { day: string; monthYear: string; weekday: string; time: string | null };
  alert: { tone: 'danger' | 'info'; text: string } | null;
  details: Array<[string, string]>;
  timeline: TimelineItem[];
  todo: string[];
  /** null = no checklist on record; [] = everything compiled. */
  outstanding: string[] | null;
  link: string;
}

const KIND_ACCENT: Record<CalendarEventKind, { main: string; tint: string }> = {
  briefing: { main: '#2563eb', tint: '#eff6ff' },
  internal_completion: { main: '#d97706', tint: '#fffbeb' },
  submission_deadline: { main: '#dc2626', tint: '#fef2f2' },
};

/** Plain text — used by Outlook web links and the standard .ics description. */
function renderText(m: InviteModel): string {
  const rule = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  const out: string[] = [rule, `${m.kindLabel.toUpperCase()} · ${m.reference}`, m.when, rule];
  if (m.alert) out.push('', `⚠ ${m.alert.text}`);
  out.push('', 'TENDER DETAILS', `• Reference: ${m.reference}`, `• Title: ${m.title}`);
  for (const [k, v] of m.details) out.push(`• ${k}: ${v}`);
  out.push('', 'KEY DATES');
  for (const t of m.timeline) out.push(`${t.current ? '▶' : '•'} ${t.label}: ${t.value}`);
  out.push('', 'WHAT TO DO');
  for (const t of m.todo) out.push(`• ${t}`);
  if (m.outstanding) {
    out.push(m.outstanding.length ? `▶ Still outstanding: ${m.outstanding.join(', ')}` : '• Checklist: all required documents compiled');
  }
  out.push('', 'OPEN IN TENDER TRACKER', m.link);
  return out.join('\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * HTML — Outlook desktop shows this version (X-ALT-DESC). Outlook renders with
 * Word's engine, so layout uses tables and inline styles only (no flex/shadows).
 */
function renderHtml(m: InviteModel): string {
  const { main, tint } = KIND_ACCENT[m.kind];
  const F = "font-family:'Segoe UI',Inter,Arial,sans-serif;";
  const muted = '#64748b';
  const ink = '#0f172a';
  const line = '#e2e8f0';
  const label = (t: string) =>
    `<p style="${F}margin:0 0 10px;font-size:8.5pt;letter-spacing:1.2px;text-transform:uppercase;color:${muted};font-weight:600;">${esc(t)}</p>`;

  const pill = `<span style="${F}background:${tint};color:${main};border:1px solid ${main};padding:3px 10px;border-radius:999px;font-size:8.5pt;font-weight:700;letter-spacing:.6px;text-transform:uppercase;">${esc(m.kindLabel)}</span>`;

  const alert = m.alert
    ? `<tr><td style="padding:0 28px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
<td style="${F}background:${m.alert.tone === 'danger' ? '#fef2f2' : '#f0f9ff'};border-left:4px solid ${m.alert.tone === 'danger' ? '#dc2626' : '#0284c7'};padding:12px 14px;font-size:10pt;color:${m.alert.tone === 'danger' ? '#991b1b' : '#075985'};"><b>${m.alert.tone === 'danger' ? 'Important' : 'Note'}:</b> ${esc(m.alert.text)}</td>
</tr></table></td></tr>`
    : '';

  const timeline = m.timeline
    .map(
      (t, i) => `<tr>
<td width="22" style="vertical-align:top;padding:${i ? 10 : 0}px 0 0;"><span style="font-size:14pt;line-height:14pt;color:${t.current ? main : '#cbd5e1'};">&#9679;</span></td>
<td style="${F}vertical-align:top;padding:${i ? 10 : 0}px 0 0;font-size:10pt;color:${t.current ? ink : muted};${t.current ? 'font-weight:600;' : ''}">${esc(t.label)}${t.current ? ` <span style="background:${tint};color:${main};padding:1px 7px;border-radius:999px;font-size:8pt;font-weight:700;">THIS EVENT</span>` : ''}</td>
<td align="right" style="${F}vertical-align:top;padding:${i ? 10 : 0}px 0 0;font-size:10pt;color:${t.current ? ink : muted};${t.current ? 'font-weight:600;' : ''}white-space:nowrap;">${esc(t.value)}</td>
</tr>`,
    )
    .join('');

  const details = m.details
    .map(
      ([k, v]) => `<tr>
<td style="${F}padding:7px 0;border-bottom:1px solid ${line};font-size:9.5pt;color:${muted};width:140px;vertical-align:top;">${esc(k)}</td>
<td style="${F}padding:7px 0;border-bottom:1px solid ${line};font-size:10pt;color:${ink};vertical-align:top;">${esc(v)}</td>
</tr>`,
    )
    .join('');

  const todo = m.todo
    .map(
      (t) => `<tr><td width="22" style="vertical-align:top;color:${main};font-size:11pt;line-height:16pt;">&#10003;</td><td style="${F}font-size:10pt;color:${ink};line-height:16pt;padding-bottom:6px;">${esc(t)}</td></tr>`,
    )
    .join('');

  const checklist =
    m.outstanding === null
      ? ''
      : m.outstanding.length === 0
        ? `<p style="${F}margin:12px 0 0;"><span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:4px 10px;border-radius:999px;font-size:9pt;font-weight:600;">&#10003; All required documents compiled</span></p>`
        : `<p style="${F}margin:14px 0 8px;font-size:9.5pt;color:${muted};">Still outstanding</p>
<p style="${F}margin:0;line-height:26px;">${m.outstanding
            .map(
              (o) =>
                `<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:4px 10px;border-radius:999px;font-size:9pt;font-weight:600;white-space:nowrap;">${esc(o)}</span>`,
            )
            .join('&nbsp; ')}</p>`;

  const card = (inner: string, pad = '22px 28px') =>
    `<tr><td style="padding:${pad};border-top:1px solid ${line};">${inner}</td></tr>`;

  return `<html><body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-collapse:collapse;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${line};border-collapse:collapse;">
<tr><td style="background:${main};height:5px;line-height:5px;font-size:1px;">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 6px;">
  <p style="${F}margin:0 0 14px;font-size:8pt;letter-spacing:1.6px;text-transform:uppercase;color:${muted};font-weight:600;">TIPP Focus &nbsp;·&nbsp; Tender Tracker</p>
  ${pill}
  <p style="${F}margin:14px 0 4px;font-size:17pt;line-height:22pt;font-weight:700;color:${ink};">${esc(m.title)}</p>
  <p style="${F}margin:0;font-size:10pt;color:${muted};">${esc(m.reference)}</p>
</td></tr>
<tr><td style="padding:18px 28px 22px;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
    <td align="center" width="76" style="${F}background:${tint};border:1px solid ${main};padding:8px 0;vertical-align:middle;">
      <p style="${F}margin:0;font-size:8pt;font-weight:700;letter-spacing:1px;color:${main};text-transform:uppercase;">${esc(m.hero.weekday)}</p>
      <p style="${F}margin:0;font-size:24pt;line-height:28pt;font-weight:700;color:${ink};">${esc(m.hero.day)}</p>
      <p style="${F}margin:0;font-size:8pt;color:${muted};text-transform:uppercase;">${esc(m.hero.monthYear)}</p>
    </td>
    <td style="padding-left:18px;vertical-align:middle;">
      <p style="${F}margin:0;font-size:9pt;color:${muted};text-transform:uppercase;letter-spacing:1px;font-weight:600;">${m.kind === 'submission_deadline' ? 'Due by' : m.hero.time ? 'Starts at' : 'Date'}</p>
      <p style="${F}margin:2px 0 0;font-size:16pt;font-weight:700;color:${ink};">${esc(m.hero.time ?? 'All day')}</p>
      <p style="${F}margin:2px 0 0;font-size:9.5pt;color:${muted};">${esc(m.when)}</p>
    </td>
  </tr></table>
</td></tr>
${alert}
${card(label('Key dates') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${timeline}</table>`)}
${card(label('Tender details') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${details}</table>`)}
${card(label('What to do') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${todo}</table>${checklist}`)}
${card(`<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="background:${ink};border-radius:8px;padding:11px 22px;"><a href="${esc(m.link)}" style="${F}color:#ffffff;text-decoration:none;font-size:10pt;font-weight:600;">Open in Tender Tracker &rarr;</a></td></tr></table>`, '22px 28px 26px')}
</table>
<p style="${F}margin:14px 0 0;font-size:8pt;color:#94a3b8;">Added from the TIPP Focus Tender Tracking System</p>
</td></tr></table>
</body></html>`;
}

/**
 * Compact HTML for Outlook on the web. The compose deep link treats the body
 * as HTML (plain-text newlines are collapsed), and it travels in the URL, so
 * this uses simple tags and few styles to stay short.
 */
function renderWebHtml(m: InviteModel): string {
  const { main } = KIND_ACCENT[m.kind];
  const muted = '#64748b';
  const head = (t: string) => `<b style="color:${main};">${esc(t)}</b>`;
  const parts: string[] = [];
  parts.push(
    `<p><b style="color:${main};font-size:14px;">${esc(m.kindLabel.toUpperCase())}</b><br>` +
      `<b>${esc(m.title)}</b><br><span style="color:${muted};">${esc(m.reference)} · ${esc(m.when)}</span></p>`,
  );
  if (m.alert) {
    const c = m.alert.tone === 'danger' ? '#b91c1c' : '#075985';
    parts.push(`<p style="color:${c};"><b>${m.alert.tone === 'danger' ? 'Important' : 'Note'}:</b> ${esc(m.alert.text)}</p>`);
  }
  parts.push(
    `<p>${head('Key dates')}<br>` +
      m.timeline
        .map((t) => (t.current ? `&#9654; <b>${esc(t.label)}: ${esc(t.value)}</b>` : `&bull; ${esc(t.label)}: ${esc(t.value)}`))
        .join('<br>') +
      '</p>',
  );
  parts.push(
    `<p>${head('Tender details')}<br>` +
      m.details.map(([k, v]) => `<span style="color:${muted};">${esc(k)}:</span> ${esc(v)}`).join('<br>') +
      '</p>',
  );
  let todo = `<p>${head('What to do')}<br>` + m.todo.map((t) => `&#10003; ${esc(t)}`).join('<br>');
  if (m.outstanding) {
    todo += m.outstanding.length
      ? `<br><b style="color:#c2410c;">Still outstanding:</b> ${esc(m.outstanding.join(', '))}`
      : `<br><b style="color:#047857;">&#10003; All required documents compiled</b>`;
  }
  parts.push(todo + '</p>');
  parts.push(`<p><a href="${esc(m.link)}"><b>Open in Tender Tracker &rarr;</b></a></p>`);
  return parts.join('');
}

function buildModel(tender: TenderLike, kind: CalendarEventKind): InviteModel {
  const compulsory = !!tender.briefing_compulsory;
  const briefingAt = tender.briefing_date ? parseBusinessDateTime(tender.briefing_date, tender.briefing_time) : null;
  const internalAt = tender.internal_completion_date ? parseDateOnly(tender.internal_completion_date) : null;
  const deadlineAt = tender.submission_deadline ? new Date(tender.submission_deadline) : null;

  const at = kind === 'briefing' ? briefingAt : kind === 'internal_completion' ? internalAt : deadlineAt;
  const timed = kind !== 'internal_completion';

  const kindLabel =
    kind === 'briefing'
      ? `${compulsory ? 'Compulsory ' : ''}Briefing`
      : kind === 'internal_completion'
        ? 'Internal completion'
        : 'Submission deadline';

  const details: Array<[string, string]> = [
    ['Client', tender.client_name],
    ...(tender.department ? [['Department', tender.department] as [string, string]] : []),
    ...(tender.category ? [['Category', tender.category] as [string, string]] : []),
    ...(tender.submission_type ? [['Submission type', tender.submission_type] as [string, string]] : []),
    ['Tender lead', `${tender.assigned_lead_name}${tender.assigned_lead_email ? ` (${tender.assigned_lead_email})` : ''}`],
  ];

  const timeline: TimelineItem[] = [
    ...(briefingAt
      ? [{ label: `Briefing${compulsory ? ' (compulsory)' : ''}`, value: fmtDateTime(briefingAt), current: kind === 'briefing' }]
      : []),
    ...(internalAt ? [{ label: 'Internal completion', value: fmtDate(internalAt), current: kind === 'internal_completion' }] : []),
    ...(deadlineAt ? [{ label: 'Submission deadline', value: fmtDateTime(deadlineAt), current: kind === 'submission_deadline' }] : []),
  ];

  const todo: string[] = [];
  let alert: InviteModel['alert'] = null;
  if (kind === 'briefing') {
    if (compulsory) alert = { tone: 'danger', text: 'This briefing is compulsory. Missing it can disqualify the bid.' };
    else todo.push('Attendance is optional but recommended.');
    todo.push('Sign the attendance register and keep proof of attendance.', 'Mark "Briefing attended" in Tender Tracker afterwards.');
    if (!tender.briefing_time) {
      alert = alert ?? { tone: 'info', text: 'No briefing time was captured, so 10:00 was assumed. Please confirm.' };
      if (compulsory) todo.push('No briefing time was captured, so 10:00 was assumed. Please confirm.');
    }
  } else if (kind === 'internal_completion') {
    todo.push('All compliance documents compiled and reviewed internally by today.', 'Hand over for final sign-off before the submission deadline.');
  } else {
    alert = { tone: 'danger', text: 'Late bids are not accepted.' };
    todo.push(`Submit before ${deadlineAt ? format(deadlineAt, 'HH:mm') : 'the deadline'}${tender.submission_type ? ` (${tender.submission_type.toLowerCase()})` : ''}.`);
  }

  return {
    kind,
    kindLabel,
    compulsory,
    reference: tender.tender_reference,
    title: tender.title,
    when: at ? (timed ? fmtDateTime(at) : `${fmtDate(at)} · all day`) : '',
    hero: {
      day: at ? format(at, 'd') : '–',
      monthYear: at ? format(at, 'MMM yyyy') : '',
      weekday: at ? format(at, 'EEE') : '',
      time: at && timed ? format(at, 'HH:mm') : null,
    },
    alert,
    details,
    timeline,
    todo,
    outstanding: kind !== 'briefing' && tender.tender_requirements ? outstandingRequirements(tender.tender_requirements) : null,
    link: tenderUrl(tender.id),
  };
}

/** All calendar-worthy dates for a tender. Missing dates are skipped. */
export function getTenderEvents(tender: TenderLike): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const ref = tender.tender_reference;
  const body = (kind: CalendarEventKind) => {
    const m = buildModel(tender, kind);
    return { description: renderText(m), htmlDescription: renderHtml(m), webDescription: renderWebHtml(m) };
  };

  if (tender.briefing_date) {
    const start = parseBusinessDateTime(tender.briefing_date, tender.briefing_time);
    const compulsory = !!tender.briefing_compulsory;
    events.push({
      uid: `${tender.id}-briefing@${UID_DOMAIN}`,
      kind: 'briefing',
      tenderId: tender.id,
      title: `${compulsory ? 'COMPULSORY ' : ''}Briefing: ${ref} – ${tender.client_name}`,
      ...body('briefing'),
      location: tender.client_name,
      start,
      end: addMinutes(start, BRIEFING_DURATION_MIN),
      allDay: false,
      reminderMinutes: compulsory ? 24 * 60 : 60,
    });
  }

  if (tender.internal_completion_date) {
    const start = parseDateOnly(tender.internal_completion_date);
    events.push({
      uid: `${tender.id}-internal@${UID_DOMAIN}`,
      kind: 'internal_completion',
      tenderId: tender.id,
      title: `Internal completion: ${ref} – ${tender.title}`,
      ...body('internal_completion'),
      start,
      end: addDaysLocal(start, 1),
      allDay: true,
      reminderMinutes: 24 * 60,
    });
  }

  if (tender.submission_deadline) {
    const deadline = new Date(tender.submission_deadline);
    events.push({
      uid: `${tender.id}-deadline@${UID_DOMAIN}`,
      kind: 'submission_deadline',
      tenderId: tender.id,
      title: `SUBMISSION DEADLINE: ${ref} – ${tender.title}`,
      ...body('submission_deadline'),
      location: tender.submission_type ?? undefined,
      // Block the hour leading up to the deadline so the entry ends on it.
      start: addMinutes(deadline, -DEADLINE_BLOCK_MIN),
      end: deadline,
      allDay: false,
      reminderMinutes: 2 * 24 * 60,
    });
  }

  return events;
}

/* ------------------------------------------------------------------ */
/* Outlook on the web                                                  */
/* ------------------------------------------------------------------ */

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildOutlookWebUrl(event: CalendarEvent, account: OutlookAccount = 'work'): string {
  const base =
    account === 'work'
      ? 'https://outlook.office.com/calendar/0/deeplink/compose'
      : 'https://outlook.live.com/calendar/0/deeplink/compose';

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.webDescription ?? event.description,
  });

  if (event.allDay) {
    params.set('startdt', ymd(event.start));
    params.set('enddt', ymd(event.end));
    params.set('allday', 'true');
  } else {
    params.set('startdt', event.start.toISOString());
    params.set('enddt', event.end.toISOString());
  }
  if (event.location) params.set('location', event.location);

  // Outlook expects %20 rather than '+' for spaces.
  return `${base}?${params.toString().replace(/\+/g, '%20')}`;
}

export function openInOutlookWeb(event: CalendarEvent, account: OutlookAccount = 'work') {
  window.open(buildOutlookWebUrl(event, account), '_blank', 'noopener,noreferrer');
}

/* ------------------------------------------------------------------ */
/* iCalendar (.ics)                                                     */
/* ------------------------------------------------------------------ */

function icsUtc(d: Date) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function icsDate(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function escapeIcsText(s: string) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 octets per RFC 5545 §3.1. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of line) {
    const b = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (currentBytes + b > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += ch;
    currentBytes += b;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcs(events: CalendarEvent[], calendarName = 'Tender Tracker'): string {
  const stamp = icsUtc(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TIPP Focus//Tender Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      'SEQUENCE:0',
      e.allDay ? `DTSTART;VALUE=DATE:${icsDate(e.start)}` : `DTSTART:${icsUtc(e.start)}`,
      e.allDay ? `DTEND;VALUE=DATE:${icsDate(e.end)}` : `DTEND:${icsUtc(e.end)}`,
      `SUMMARY:${escapeIcsText(e.title)}`,
      `DESCRIPTION:${escapeIcsText(e.description)}`,
      ...(e.htmlDescription ? [`X-ALT-DESC;FMTTYPE=text/html:${escapeIcsText(e.htmlDescription)}`] : []),
      ...(e.location ? [`LOCATION:${escapeIcsText(e.location)}`] : []),
      `CATEGORIES:${escapeIcsText(eventKindLabels[e.kind])}`,
      `URL:${tenderUrl(e.tenderId)}`,
      `TRANSP:${e.allDay ? 'TRANSPARENT' : 'OPAQUE'}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(e.title)}`,
      `TRIGGER:-PT${e.reminderMinutes}M`,
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

export function safeFileName(s: string) {
  return s.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'tender';
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

/** Collect events across many tenders, optionally filtered by kind and date window. */
export function collectEvents(
  tenders: TenderLike[],
  opts: { kinds?: CalendarEventKind[]; from?: Date; to?: Date } = {},
): CalendarEvent[] {
  const { kinds, from, to } = opts;
  return tenders
    .flatMap(getTenderEvents)
    .filter((e) => !kinds || kinds.includes(e.kind))
    .filter((e) => !from || e.end >= from)
    .filter((e) => !to || e.start <= to)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
