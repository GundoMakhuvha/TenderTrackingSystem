/**
 * Builds the "tender" emails: new tender, added to the team, lead reassigned
 * and dates updated. Uses the same design and calendar logic as the app's
 * Outlook invites (calendar.ts is a generated copy of src/lib/calendar.ts).
 *
 * No Deno or Node APIs here, so the unit tests can run it too.
 */
import {
  buildIcs,
  buildOutlookWebUrl,
  esc,
  eventKindLabels,
  fmtDate,
  fmtTime,
  getTenderEvents,
  KIND_ACCENT,
  outstandingRequirements,
  requirementsOf,
  safeFileName,
  shortTitle,
  tenderUrl,
  type CalendarEvent,
  type TenderLike,
} from './calendar.ts';

export type TenderEmailReason = 'created' | 'added' | 'reassigned' | 'dates_changed';

export interface Person {
  name: string;
  email: string;
}

export interface TenderEmailInput {
  tender: TenderLike;
  recipient: Person;
  role: 'lead' | 'member';
  reason: TenderEmailReason;
  lead: Person | null;
  /** Team members other than the lead. */
  team: Person[];
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
  attachment: { filename: string; content: string } | null;
}

const BRAND = '#1e3a8a';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const F = "font-family:'Segoe UI',Inter,Arial,sans-serif;";

/** UTF-8 safe base64 (Resend attachments). */
export function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

const firstName = (p: Person) => (p.name || p.email).split(/\s+/)[0];

const anchorOf = (e: CalendarEvent) => (e.kind === 'submission_deadline' ? e.end : e.start);
const whenOf = (e: CalendarEvent) =>
  e.allDay ? `${fmtDate(e.start)} · all day` : `${fmtDate(anchorOf(e))}, ${fmtTime(anchorOf(e))}`;

function copyFor(input: TenderEmailInput) {
  const { reason, role, tender, lead } = input;
  const ref = tender.tender_reference;
  const leadName = lead?.name || tender.assigned_lead_name;

  switch (reason) {
    case 'created':
      return role === 'lead'
        ? {
            pill: 'New tender',
            subject: `New tender ${ref}: you are the tender lead`,
            intro: 'A new tender has been created and you are the tender lead.',
          }
        : {
            pill: 'New tender',
            subject: `New tender ${ref}: you have been added to the team`,
            intro: `A new tender has been created and you have been added to the team. ${leadName} is the tender lead.`,
          };
    case 'added':
      return {
        pill: 'Added to team',
        subject: `You have been added to tender ${ref}`,
        intro: `You have been added to the team for this tender. ${leadName} is the tender lead.`,
      };
    case 'reassigned':
      return {
        pill: 'Now your tender',
        subject: `Tender ${ref} has been assigned to you`,
        intro: 'This tender has been reassigned to you. You are now the tender lead.',
      };
    case 'dates_changed':
      return {
        pill: 'Dates updated',
        subject: `Updated dates for tender ${ref}`,
        intro:
          'The key dates for this tender have changed. Open the attached calendar file to update the entries in your Outlook calendar.',
      };
  }
}

function todoFor(input: TenderEmailInput, events: CalendarEvent[]): string[] {
  const { role, tender, reason } = input;
  const items: string[] = [];
  const briefing = events.find((e) => e.kind === 'briefing');
  if (reason === 'dates_changed') {
    items.push('Open the attached tender-dates.ics file so your Outlook calendar shows the new dates.');
  } else if (role === 'lead') {
    items.push('Review the tender documents and confirm the team and their sections.');
    items.push('Keep the requirements checklist up to date in Tender Tracker.');
  } else {
    items.push('Check with the tender lead which sections you are responsible for.');
  }
  if (briefing && tender.briefing_compulsory) {
    items.push('Make sure someone attends the compulsory briefing and signs the register.');
  }
  return items;
}

/** Designed email + plain text + .ics attachment for one recipient. */
export function buildTenderEmail(input: TenderEmailInput): BuiltEmail {
  const { tender, recipient, lead, team } = input;
  const events = getTenderEvents(tender);
  const copy = copyFor(input);
  const link = tenderUrl(tender.id);
  const deadline = events.find((e) => e.kind === 'submission_deadline');
  const hero = deadline ?? events[0] ?? null;
  const accent = KIND_ACCENT.briefing; // brand blue for tender emails
  const req = requirementsOf(tender);
  const outstanding = req ? outstandingRequirements(req) : null;
  const todo = todoFor(input, events);
  const compulsoryBriefing = events.find((e) => e.kind === 'briefing') && tender.briefing_compulsory;

  const details: Array<[string, string]> = [
    ['Reference', tender.tender_reference],
    ['Client', tender.client_name],
    ...(tender.department ? [['Department', tender.department] as [string, string]] : []),
    ...(tender.category ? [['Category', tender.category] as [string, string]] : []),
    ...(tender.submission_type ? [['Submission type', tender.submission_type] as [string, string]] : []),
  ];

  const people: Array<[string, string]> = [
    ['Tender lead', lead ? `${lead.name}${lead.email ? ` (${lead.email})` : ''}` : tender.assigned_lead_name],
    ...team.map((p, i) => [i === 0 ? 'Team' : '', `${p.name}${p.email ? ` (${p.email})` : ''}`] as [string, string]),
  ];

  /* ---------- HTML ---------- */
  const label = (t: string) =>
    `<p style="${F}margin:0 0 10px;font-size:8.5pt;letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};font-weight:600;">${esc(t)}</p>`;
  const card = (inner: string, pad = '22px 28px') =>
    `<tr><td style="padding:${pad};border-top:1px solid ${LINE};">${inner}</td></tr>`;
  const table = (rows: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;
  const kv = (rows: Array<[string, string]>) =>
    table(
      rows
        .map(
          ([k, v]) => `<tr>
<td style="${F}padding:7px 0;border-bottom:1px solid ${LINE};font-size:9.5pt;color:${MUTED};width:140px;vertical-align:top;">${esc(k)}</td>
<td style="${F}padding:7px 0;border-bottom:1px solid ${LINE};font-size:10pt;color:${INK};vertical-align:top;">${esc(v)}</td></tr>`,
        )
        .join(''),
    );

  const dateRows = events.length
    ? table(
        events
          .map((e) => {
            const dot = KIND_ACCENT[e.kind].main;
            return `<tr>
<td width="22" style="vertical-align:top;padding:8px 0;"><span style="font-size:14pt;line-height:14pt;color:${dot};">&#9679;</span></td>
<td style="${F}vertical-align:top;padding:8px 0;font-size:10pt;color:${INK};font-weight:600;">${esc(eventKindLabels[e.kind])}${
              e.kind === 'briefing' && tender.briefing_compulsory ? ' <span style="color:#b91c1c;">(compulsory)</span>' : ''
            }<br><span style="font-weight:400;color:${MUTED};">${esc(whenOf(e))}</span></td>
<td align="right" style="${F}vertical-align:top;padding:8px 0;white-space:nowrap;"><a href="${esc(buildOutlookWebUrl(e, 'work'))}" style="color:${BRAND};font-size:9pt;font-weight:600;text-decoration:none;">+ Add to Outlook</a></td>
</tr>`;
          })
          .join(''),
      ) +
      `<p style="${F}margin:12px 0 0;font-size:9pt;color:${MUTED};">&#128206; <b>tender-dates.ics</b> is attached. Open it to add all ${events.length} date${
        events.length === 1 ? '' : 's'
      } to Outlook in one go. Opening it again later updates the entries instead of duplicating them.</p>`
    : `<p style="${F}margin:0;font-size:10pt;color:${MUTED};">No dates have been captured yet.</p>`;

  const heroBlock = hero
    ? (() => {
        const at = anchorOf(hero);
        const [wd, dd, mon, yr] = fmtDate(at).split(' ');
        return `<tr><td style="padding:4px 28px 22px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
<td align="center" width="76" style="${F}background:${accent.tint};border:1px solid ${accent.main};padding:8px 0;vertical-align:middle;">
<p style="${F}margin:0;font-size:8pt;font-weight:700;letter-spacing:1px;color:${accent.main};text-transform:uppercase;">${esc(wd)}</p>
<p style="${F}margin:0;font-size:24pt;line-height:28pt;font-weight:700;color:${INK};">${esc(String(Number(dd)))}</p>
<p style="${F}margin:0;font-size:8pt;color:${MUTED};text-transform:uppercase;">${esc(`${mon} ${yr}`)}</p></td>
<td style="padding-left:18px;vertical-align:middle;">
<p style="${F}margin:0;font-size:9pt;color:${MUTED};text-transform:uppercase;letter-spacing:1px;font-weight:600;">${esc(
          hero.kind === 'submission_deadline' ? 'Submission deadline' : eventKindLabels[hero.kind],
        )}</p>
<p style="${F}margin:2px 0 0;font-size:16pt;font-weight:700;color:${INK};">${esc(hero.allDay ? 'All day' : fmtTime(at))}</p>
<p style="${F}margin:2px 0 0;font-size:9.5pt;color:${MUTED};">${esc(whenOf(hero))}</p></td>
</tr></table></td></tr>`;
      })()
    : '';

  const alert = compulsoryBriefing
    ? `<tr><td style="padding:0 28px 20px;">${table(
        `<tr><td style="${F}background:#fef2f2;border-left:4px solid #dc2626;padding:12px 14px;font-size:10pt;color:#991b1b;"><b>Important:</b> the briefing is compulsory. Missing it can disqualify the bid.</td></tr>`,
      )}</td></tr>`
    : '';

  const todoHtml =
    table(
      todo
        .map(
          (t) =>
            `<tr><td width="22" style="vertical-align:top;color:${BRAND};font-size:11pt;line-height:16pt;">&#10003;</td><td style="${F}font-size:10pt;color:${INK};line-height:16pt;padding-bottom:6px;">${esc(t)}</td></tr>`,
        )
        .join(''),
    ) +
    (outstanding === null
      ? ''
      : outstanding.length === 0
        ? `<p style="${F}margin:12px 0 0;"><span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:4px 10px;font-size:9pt;font-weight:600;">&#10003; All required documents compiled</span></p>`
        : `<p style="${F}margin:14px 0 8px;font-size:9.5pt;color:${MUTED};">Still outstanding</p><p style="${F}margin:0;line-height:26px;">${outstanding
            .map(
              (o) =>
                `<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:4px 10px;font-size:9pt;font-weight:600;white-space:nowrap;">${esc(o)}</span>`,
            )
            .join('&nbsp; ')}</p>`);

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-collapse:collapse;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${LINE};border-collapse:collapse;">
<tr><td style="background:${BRAND};height:5px;line-height:5px;font-size:1px;">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 6px;">
<p style="${F}margin:0 0 14px;font-size:8pt;letter-spacing:1.6px;text-transform:uppercase;color:${MUTED};font-weight:600;">TIPP Focus &nbsp;·&nbsp; Tender Tracker</p>
<span style="${F}background:${accent.tint};color:${accent.main};border:1px solid ${accent.main};padding:3px 10px;font-size:8.5pt;font-weight:700;letter-spacing:.6px;text-transform:uppercase;">${esc(copy.pill)}</span>
<p style="${F}margin:14px 0 4px;font-size:17pt;line-height:22pt;font-weight:700;color:${INK};">${esc(shortTitle(tender.title))}</p>
<p style="${F}margin:0;font-size:10pt;color:${MUTED};">${esc(tender.tender_reference)} &nbsp;·&nbsp; ${esc(tender.client_name)}</p>
</td></tr>
<tr><td style="padding:16px 28px 14px;">
<p style="${F}margin:0 0 6px;font-size:11pt;color:${INK};">Hi ${esc(firstName(recipient))},</p>
<p style="${F}margin:0;font-size:10.5pt;line-height:16pt;color:${INK};">${esc(copy.intro)}</p>
</td></tr>
${heroBlock}
${alert}
${card(label('Key dates') + dateRows)}
${card(label('Tender details') + kv(details))}
${card(label('People') + kv(people))}
${card(label('What to do') + todoHtml)}
${card(`<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="background:${INK};padding:11px 22px;"><a href="${esc(link)}" style="${F}color:#ffffff;text-decoration:none;font-size:10pt;font-weight:600;">Open in Tender Tracker &rarr;</a></td></tr></table>`, '22px 28px 26px')}
</table>
<p style="${F}margin:14px 0 0;font-size:8pt;color:#94a3b8;">You are receiving this because you are on this tender in the TIPP Focus Tender Tracking System. Replies go to the tender lead.</p>
</td></tr></table>
</body></html>`;

  /* ---------- Plain text ---------- */
  const text = [
    `Hi ${firstName(recipient)},`,
    '',
    copy.intro,
    '',
    `${tender.title}`,
    `${tender.tender_reference} · ${tender.client_name}`,
    ...(compulsoryBriefing ? ['', 'IMPORTANT: the briefing is compulsory. Missing it can disqualify the bid.'] : []),
    '',
    'KEY DATES',
    ...(events.length ? events.map((e) => `• ${eventKindLabels[e.kind]}: ${whenOf(e)}`) : ['• No dates captured yet']),
    ...(events.length ? ['(tender-dates.ics is attached: open it to add these to Outlook)'] : []),
    '',
    'TENDER DETAILS',
    ...details.map(([k, v]) => `• ${k}: ${v}`),
    '',
    'PEOPLE',
    ...people.map(([k, v]) => `• ${k ? `${k}: ` : ''}${v}`),
    '',
    'WHAT TO DO',
    ...todo.map((t) => `• ${t}`),
    ...(outstanding && outstanding.length ? [`• Still outstanding: ${outstanding.join(', ')}`] : []),
    '',
    `Open in Tender Tracker: ${link}`,
  ].join('\n');

  return {
    subject: copy.subject,
    html,
    text,
    attachment: events.length
      ? {
          filename: 'tender-dates.ics',
          content: toBase64(buildIcs(events, `Tender ${tender.tender_reference}`)),
        }
      : null,
  };
}

/** File-safe name, re-exported for the function. */
export { safeFileName };
