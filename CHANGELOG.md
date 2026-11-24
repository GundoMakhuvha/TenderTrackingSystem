# Changelog

## 2.1.0 (24 Nov 2026): tender emails

### New
- **Tender Team on the New Tender form:** pick the tender lead and up to 5 team members when creating a tender
- **Tender emails** (same design as the Outlook invites), sent from tenders@tippfocus.co.za with replies going to the tender lead:
  - New tender: to the lead and every team member
  - Added to the team later: to the new member
  - Lead reassigned: to the new lead
  - Dates updated: a "Notify team" prompt appears on the tender page after dates are edited
- Every tender email lists the key dates with an "Add to Outlook" link per date and attaches **tender-dates.ics** with all of them; re-opening an updated file replaces the old Outlook entries
- Status and other notification emails restyled to match

### Changed
- Calendar logic is shared between the app and the email function (`npm run sync:calendar` keeps the function's copy in step; a test fails if they drift)
- Dates and times in invites always show South African time, wherever the code runs
- Very long tender titles are shortened in invite and email headings
- Email sender, name and app link are settings (NOTIFY_FROM_EMAIL, NOTIFY_FROM_NAME, APP_URL) instead of being hard coded

## 2.0.0 — 12 Nov 2026

### New
- **Outlook calendar integration** for briefings, internal completion dates and submission deadlines
  - Per date: Outlook (Microsoft 365), Outlook.com, or `.ics` for Outlook desktop
  - "Add to Outlook" on the tender page header, a new Key Dates card on each tender, and on the briefing section
  - Bulk export: filtered tender list, Key Dates page (7 / 30 / 90 days, all upcoming, month shown), and "my dates" on the profile
  - Structured invite body: banner, Tender details, Key dates (with the current one marked), Responsible, What to do (incl. outstanding checklist items) and a link back to the tender. Outlook desktop gets a formatted HTML version; Outlook web gets clean structured text
  - Stable event IDs, so re-importing updates entries; built-in reminders; links back to the tender
- **Breadcrumbs** across all signed-in pages (tender reference instead of the ID, collapses on long paths), plus browser tab titles that match
- **Key Dates page** (`/calendar`) with agenda and month views, filters (type, tenders I lead, hide closed)
- **My Profile page** (`/profile`) — the account menu linked here before, but the page didn't exist
- **Dashboard:** "Upcoming Briefings" panel (next 14 days, not yet attended) with Outlook buttons
- **Dark mode** toggle in the header (also light/dark/system in the profile)
- After login you are taken back to the page you were trying to open (useful for links in calendar entries)
- Tender list: filters are remembered while you navigate, "Reset all filters" button
- After creating a tender you land on it, ready to add its dates to Outlook

### Fixed
- "Compulsory briefing" wasn't saved when creating a tender
- Choosing the **Demo** status failed because the database enum didn't include it → new migration `20261112170000_add_demo_tender_status.sql`
- Opening a tender didn't highlight "Tenders" in the menu
- Proper 404 page inside the app layout

### Improved
- Pages load on demand (code splitting), with a page-level error boundary that offers a reload after a new deploy
- Skip-to-content link and `aria-current` on navigation for accessibility
- App no longer indexed by search engines (`noindex`, `robots.txt`)
- Unit tests for the calendar engine and breadcrumbs

### Removed
- Everything Lovable: `lovable-tagger` plugin, Lovable preview-auth broker (`previewAuthStorage.ts`), Bun lockfiles, Lovable favicon/placeholder and generated-file comments. The Supabase client now uses plain `localStorage`.
