import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { configureCalendar } from '../../supabase/functions/send-notification-email/calendar.ts';
import { buildTenderEmail } from '../../supabase/functions/send-notification-email/tender-email.ts';

configureCalendar({ baseUrl: 'https://bids.tippfocus.co.za' });

const tender = {
  id: '5f09edfe-c07e-4368-8080-0ab337a23655',
  tender_reference: 'DHA20-2026',
  title:
    'APPOINTMENT OF A SERVICE PROVIDER FROM SITA RFB1183 FOR THE ESTABLISHMENT OF AN ICT PORTFOLIO MANAGEMENT OFFICE (PMO) TO DELIVER THE DIGITAL TRANSFORMATION STRATEGY',
  client_name: 'Department of Home Affairs',
  submission_deadline: '2026-11-27T09:00:00Z',
  assigned_lead_name: 'Gundo Makhuvha',
  assigned_lead_email: 'gundom@tippfocus.co.za',
  briefing_date: '2026-11-25',
  briefing_time: '10:00',
  briefing_compulsory: true,
  internal_completion_date: '2026-11-24',
  submission_type: 'Electronic',
  department: 'Technology',
  updated_at: '2026-11-24T07:00:00Z',
  tender_requirements: [{ quote_required: true, quote_status: 'requested', technical_response_status: 'in_progress', pricing_finalised: false }],
};
const lead = { name: 'Gundo Makhuvha', email: 'gundom@tippfocus.co.za' };
const team = [{ name: 'Murendeni Ramadi', email: 'murendeni@tippfocus.co.za' }];

describe('tender email', () => {
  it('builds the lead email with all dates attached', () => {
    const e = buildTenderEmail({ tender, recipient: lead, role: 'lead', reason: 'created', lead, team });
    expect(e.subject).toBe('New tender DHA20-2026: you are the tender lead');
    expect(e.html).toContain('Hi Gundo');
    expect(e.html).toContain('Murendeni Ramadi');
    expect(e.html).toContain('compulsory');
    expect(e.html).toContain('https://bids.tippfocus.co.za/tenders/5f09edfe');
    expect(e.html).toContain('outlook.office.com');
    expect(e.text).toContain('Still outstanding: Quote, Technical response, Pricing');
    const ics = Buffer.from(e.attachment!.content, 'base64').toString('utf8');
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(3);
    expect(ics).toContain('SEQUENCE:1795503600');
    expect(ics).toContain('DTSTART:20261125T080000Z');
  });

  it('shows times in South African time even on a UTC server', () => {
    const e = buildTenderEmail({ tender, recipient: lead, role: 'lead', reason: 'created', lead, team });
    expect(e.text).toContain('Submission deadline: Fri 27 Nov 2026, 11:00');
    expect(e.text).toContain('Internal completion: Tue 24 Nov 2026 · all day');
  });

  it('words the email for team members and date changes', () => {
    const m = buildTenderEmail({ tender, recipient: team[0], role: 'member', reason: 'added', lead, team });
    expect(m.subject).toBe('You have been added to tender DHA20-2026');
    expect(m.html).toContain('Gundo Makhuvha is the tender lead');
    const d = buildTenderEmail({ tender, recipient: team[0], role: 'member', reason: 'dates_changed', lead, team });
    expect(d.subject).toBe('Updated dates for tender DHA20-2026');
  });

  it('shortens very long titles in the heading', () => {
    const e = buildTenderEmail({ tender, recipient: lead, role: 'lead', reason: 'created', lead, team });
    expect(e.html).toContain('…</p>');
  });

  it('copes with a tender that has no dates yet', () => {
    const e = buildTenderEmail({
      tender: { ...tender, briefing_date: null, internal_completion_date: null, submission_deadline: null },
      recipient: lead, role: 'lead', reason: 'created', lead, team: [],
    });
    expect(e.attachment).toBeNull();
    expect(e.html).toContain('No dates have been captured yet');
  });
});

describe('calendar copy for the email function', () => {
  it('matches src/lib/calendar.ts (run npm run sync:calendar if this fails)', () => {
    const src = readFileSync('src/lib/calendar.ts', 'utf8');
    const copy = readFileSync('supabase/functions/send-notification-email/calendar.ts', 'utf8');
    expect(copy.slice(copy.indexOf('\n') + 1)).toBe(src);
  });
});
