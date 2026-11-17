import { describe, it, expect } from 'vitest';
import {
  buildIcs,
  buildOutlookWebUrl,
  collectEvents,
  escapeIcsText,
  foldIcsLine,
  getTenderEvents,
  parseBusinessDateTime,
} from '@/lib/calendar';

const tender = {
  id: '11111111-2222-4333-8444-555555555555',
  tender_reference: 'FAIS2026/27 T001',
  title: 'Dynamics 365 CRM support, maintenance; Azure Blob',
  client_name: 'FAIS Ombud',
  submission_deadline: '2026-11-20T09:00:00.000Z', // 11:00 SAST
  assigned_lead_name: 'Gundo Makhuvha',
  assigned_lead_email: 'gundo@example.com',
  briefing_date: '2026-11-16',
  briefing_time: '10:30:00',
  briefing_compulsory: true,
  internal_completion_date: '2026-11-18',
  submission_type: 'Electronic',
};

describe('getTenderEvents', () => {
  it('creates briefing, internal and deadline events', () => {
    const events = getTenderEvents(tender);
    expect(events.map((e) => e.kind)).toEqual(['briefing', 'internal_completion', 'submission_deadline']);
  });

  it('treats briefing time as South African time', () => {
    const [briefing] = getTenderEvents(tender);
    expect(briefing.start.toISOString()).toBe('2026-11-16T08:30:00.000Z');
    expect(briefing.title).toMatch(/^COMPULSORY Briefing/);
  });

  it('ends the deadline block exactly on the deadline', () => {
    const deadline = getTenderEvents(tender).find((e) => e.kind === 'submission_deadline')!;
    expect(deadline.end.toISOString()).toBe('2026-11-20T09:00:00.000Z');
    expect(deadline.start.toISOString()).toBe('2026-11-20T08:00:00.000Z');
  });

  it('skips missing dates', () => {
    const events = getTenderEvents({ ...tender, briefing_date: null, internal_completion_date: null });
    expect(events).toHaveLength(1);
  });

  it('defaults missing briefing time to 10:00', () => {
    expect(parseBusinessDateTime('2026-11-16', null).toISOString()).toBe('2026-11-16T08:00:00.000Z');
  });
});

describe('Outlook web links', () => {
  it('builds a Microsoft 365 compose link', () => {
    const [briefing] = getTenderEvents(tender);
    const url = new URL(buildOutlookWebUrl(briefing, 'work'));
    expect(url.origin).toBe('https://outlook.office.com');
    expect(url.searchParams.get('subject')).toContain('FAIS2026/27 T001');
    expect(url.searchParams.get('startdt')).toBe('2026-11-16T08:30:00.000Z');
    expect(url.toString()).not.toContain('+');
  });

  it('uses outlook.live.com for personal accounts and all-day flags', () => {
    const internal = getTenderEvents(tender).find((e) => e.kind === 'internal_completion')!;
    const url = new URL(buildOutlookWebUrl(internal, 'personal'));
    expect(url.origin).toBe('https://outlook.live.com');
    expect(url.searchParams.get('allday')).toBe('true');
    expect(url.searchParams.get('startdt')).toBe('2026-11-18');
    expect(url.searchParams.get('enddt')).toBe('2026-11-19');
  });
});

describe('ICS output', () => {
  const ics = buildIcs(getTenderEvents(tender));

  it('is a valid calendar with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(3);
    expect((ics.match(/BEGIN:VALARM/g) ?? []).length).toBe(3);
  });

  it('uses stable UIDs so re-imports update rather than duplicate', () => {
    expect(ics).toContain(`UID:${tender.id}-briefing@`);
    expect(buildIcs(getTenderEvents(tender))).toContain(`UID:${tender.id}-deadline@`);
  });

  it('writes all-day and UTC times correctly', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261118');
    expect(ics).toContain('DTEND;VALUE=DATE:20261119');
    expect(ics).toContain('DTSTART:20261116T083000Z');
  });

  it('keeps every physical line within 75 octets', () => {
    const enc = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
  });

  it('escapes special characters', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    expect(ics).toContain('support\\, maintenance\\; Azure');
  });

  it('folds long multi-byte lines without splitting characters', () => {
    const folded = foldIcsLine('SUMMARY:' + 'é'.repeat(80));
    const unfolded = folded.replace(/\r\n /g, '');
    expect(unfolded).toBe('SUMMARY:' + 'é'.repeat(80));
  });
});

describe('collectEvents', () => {
  it('filters by kind and window, sorted by start', () => {
    const events = collectEvents([tender], {
      kinds: ['briefing', 'submission_deadline'],
      from: new Date('2026-11-17T00:00:00Z'),
    });
    expect(events.map((e) => e.kind)).toEqual(['submission_deadline']);
  });
});

describe('Outlook web body', () => {
  it('sends HTML with line breaks, not plain-text newlines', () => {
    const deadline = getTenderEvents(tender).find((e) => e.kind === 'submission_deadline')!;
    const body = new URL(buildOutlookWebUrl(deadline)).searchParams.get('body')!;
    expect(body).toContain('<br>');
    expect(body).not.toContain('\n');
    expect(body).toContain('Open in Tender Tracker');
  });

  it('keeps the link short enough for Outlook', () => {
    for (const e of getTenderEvents(tender)) {
      expect(buildOutlookWebUrl(e).length).toBeLessThan(4000);
    }
  });
});
