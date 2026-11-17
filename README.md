# Tender Tracking System — TIPP Focus

Internal tool for tracking tenders from intake to outcome: approvals, compliance
checklists, document uploads, team assignment, key dates and analytics.

Developed by Gundo Makhuvha.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Storage, Edge Functions)
- TanStack Query, React Router
- Hosted on Vercel

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL and key
npm run dev            # http://localhost:8080
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Anon / publishable key (safe for the browser) |
| `VITE_SUPABASE_PROJECT_ID` | no | Project ref |
| `VITE_APP_UTC_OFFSET` | no | Offset for briefing times in calendar invites. Default `+02:00` (SAST) |

On Vercel, set these under **Project → Settings → Environment Variables** as well.

### Database

Migrations live in `supabase/migrations`. Apply new ones with the Supabase CLI
(`supabase db push`) or paste them into the SQL editor in order.

## Features

- **Dashboard** — stats, overdue tenders, upcoming deadlines and briefings, analytics charts
- **Tenders** — search, filters (remembered while you navigate), approval queue, bulk CSV upload
- **Tender detail** — inline editing, status, requirements checklist with uploads, team, PDF report
- **Key Dates** (`/calendar`) — agenda and month views of every briefing, internal completion date and submission deadline
- **Outlook calendar** — add any date to Outlook:
  - *Outlook (work / Microsoft 365)* and *Outlook.com* open a pre-filled new-event form
  - *.ics* download opens straight in Outlook desktop; bulk export for a list, a date range or "my tenders"
  - Each entry has a fixed ID, so importing again updates the entry instead of creating a duplicate
  - Reminders: compulsory briefings 1 day before, other briefings 1 hour, internal dates 1 day, deadlines 2 days
- **Breadcrumbs** on every page, with tender references instead of IDs, and matching browser tab titles
- **My Profile** — name, password, theme (light/dark/system), one-click export of your own dates
- Role-based access: Admin, Bids Team, Team Member
