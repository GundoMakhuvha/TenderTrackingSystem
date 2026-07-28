# 📋 Tender Tracking System

A modern web application for managing and tracking tender submissions end-to-end — from creation and document generation to status tracking and automated notifications.

Built for **Tipp Focus Holdings** to streamline how tenders are logged, monitored, and reported on.

---

## ✨ Features

- **Tender Management** — Create, view, edit, and list tenders with a clean, structured workflow
- **PDF Reports** — Generate polished, exportable tender reports directly from the app
- **Authentication** — Secure user login and session handling
- **Automated Notifications** — Email alerts triggered via Supabase Edge Functions (e.g. status updates, new tenders)
- **Real-time Data** — Powered by Supabase for live data sync and storage
- **Responsive UI** — Built with a component-driven design system for a consistent experience across devices

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Backend / Database | Supabase (Postgres, Auth, Edge Functions) |
| Charts & Reporting | Custom chart components + PDF generation |
| Hosting | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm
- A Supabase project (URL + anon key)

### Installation

```bash
git clone https://github.com/GundoMakhuvha/TenderTrackingSystem.git
cd TenderTrackingSystem
npm install
```

### Environment Setup

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in your terminal).

### Build for Production

```bash
npm run build
```

---

## 🗂️ Project Structure

```
├── src/
│   ├── components/
│   │   ├── layout/         # App shell & layout components
│   │   ├── tender/         # Tender-specific components (e.g. PDF report)
│   │   └── ui/             # Shared UI components (charts, etc.)
│   ├── pages/               # Route-level pages (Auth, TenderList, TenderDetail, TenderForm)
│   └── integrations/
│       └── supabase/        # Supabase client & generated types
├── supabase/
│   ├── functions/            # Edge Functions (e.g. send-notification-email)
│   └── migrations/           # Database schema migrations
└── index.html
```

---

## 🗄️ Database Migrations

Migrations live in `supabase/migrations/` and are applied via the Supabase CLI:

```bash
supabase db push
```

---

## 📧 Notifications

The `send-notification-email` Edge Function handles outbound email notifications. Make sure any required secrets (SMTP/email provider keys, etc.) are configured in your Supabase project's function environment variables — **not** hardcoded in the function source.

---

## 📄 License

Internal project — © Tipp Focus Holdings. All rights reserved.

---

Built with 🛠️ by [Gundo Makhuvha](https://github.com/GundoMakhuvha)
