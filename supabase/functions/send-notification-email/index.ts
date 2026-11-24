/**
 * send-notification-email
 *
 * Two ways in:
 *  1. Database hook (x-hook-secret): fired for every new row in `notifications`.
 *     - new_tender / team_assignment / reassignment → the designed tender email
 *       with the tender's dates attached as tender-dates.ics
 *     - dates_changed → skipped (that email is sent directly, see 2)
 *     - anything else → a short branded notification email
 *  2. Signed-in user (Authorization: Bearer <jwt>) with
 *     { tender_id, action: "dates_changed" } → emails the lead and team the
 *     updated dates. Only admins, the bids team and the tender lead may do this.
 *
 * Settings (Lovable → Cloud → Secrets):
 *  RESEND_API_KEY (required), NOTIFY_HOOK_SECRET (required, existing)
 *  NOTIFY_FROM_EMAIL (default tenders@tippfocus.co.za), NOTIFY_FROM_NAME,
 *  APP_URL (default https://bids.tippfocus.co.za)
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { configureCalendar, type TenderLike } from "./calendar.ts";
import { buildTenderEmail, type Person, type TenderEmailReason } from "./tender-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const HOOK_SECRET = Deno.env.get("NOTIFY_HOOK_SECRET");
const FROM_EMAIL = Deno.env.get("NOTIFY_FROM_EMAIL") || "tenders@tippfocus.co.za";
const FROM_NAME = Deno.env.get("NOTIFY_FROM_NAME") || "Tipp Focus Tenders";
const APP_URL = (Deno.env.get("APP_URL") || "https://bids.tippfocus.co.za").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

configureCalendar({ baseUrl: APP_URL });

/** Notification types that get the full tender email. */
const TENDER_EMAIL_TYPES: Record<string, TenderEmailReason> = {
  new_tender: "created",
  team_assignment: "added",
  reassignment: "reassigned",
};
/** Notification types whose email is sent elsewhere. */
const SKIP_EMAIL_TYPES = new Set(["dates_changed"]);

const SUBJECTS: Record<string, string> = {
  status_change: "Tender status updated",
  due_date: "Tender due soon",
  approval_required: "A tender needs your approval",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Short branded email for simple notifications (status changes etc.). */
function buildSimpleHtml(name: string, message: string, link: string | null) {
  const F = "font-family:'Segoe UI',Inter,Arial,sans-serif;";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border:1px solid #e2e8f0;">
<tr><td style="background:#1e3a8a;height:5px;line-height:5px;font-size:1px;">&nbsp;</td></tr>
<tr><td style="padding:24px 28px;">
<p style="${F}margin:0 0 16px;font-size:8pt;letter-spacing:1.6px;text-transform:uppercase;color:#64748b;font-weight:600;">TIPP Focus &nbsp;·&nbsp; Tender Tracker</p>
<p style="${F}margin:0 0 10px;font-size:11pt;color:#0f172a;">Hi ${escapeHtml(name.split(/\s+/)[0])},</p>
<p style="${F}margin:0 0 22px;font-size:10.5pt;line-height:16pt;color:#0f172a;">${escapeHtml(message)}</p>
${
  link
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#0f172a;padding:11px 22px;"><a href="${link}" style="${F}color:#ffffff;text-decoration:none;font-size:10pt;font-weight:600;">Open in Tender Tracker &rarr;</a></td></tr></table>`
    : ""
}
</td></tr></table>
<p style="${F}margin:14px 0 0;font-size:8pt;color:#94a3b8;">You are receiving this because you are on a tender in the TIPP Focus Tender Tracking System.</p>
</td></tr></table></body></html>`;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  attachment?: { filename: string; content: string } | null;
  idempotencyKey?: string;
}

async function sendEmail(a: SendArgs) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(a.idempotencyKey ? { "Idempotency-Key": a.idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [a.to],
      subject: a.subject,
      html: a.html,
      text: a.text,
      ...(a.replyTo && a.replyTo.toLowerCase() !== a.to.toLowerCase() ? { reply_to: a.replyTo } : {}),
      ...(a.attachment ? { attachments: [a.attachment] } : {}),
    }),
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Resend failed [${res.status}]: ${details}`);
  }
}

interface TenderContext {
  tender: TenderLike & { created_at?: string };
  lead: Person | null;
  leadUserId: string | null;
  /** Team members other than the lead. */
  team: Array<Person & { userId: string }>;
}

async function loadTenderContext(db: SupabaseClient, tenderId: string): Promise<TenderContext | null> {
  const { data: tender, error } = await db
    .from("tenders")
    .select("*, tender_requirements(*)")
    .eq("id", tenderId)
    .maybeSingle();
  if (error) throw error;
  if (!tender) return null;

  const leadEmail = (tender.assigned_lead_email ?? "").trim();
  const { data: leadProfile } = leadEmail
    ? await db.from("profiles").select("id, email, full_name").ilike("email", leadEmail).maybeSingle()
    : { data: null };

  const { data: members } = await db.from("tender_team_members").select("user_id").eq("tender_id", tenderId);
  const ids = (members ?? []).map((m) => m.user_id).filter((id) => id !== leadProfile?.id);
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("id, email, full_name").in("id", ids)
    : { data: [] as Array<{ id: string; email: string; full_name: string | null }> };

  return {
    tender,
    leadUserId: leadProfile?.id ?? null,
    lead: leadEmail
      ? { name: leadProfile?.full_name || tender.assigned_lead_name || leadEmail, email: leadEmail }
      : null,
    team: (profiles ?? [])
      .filter((p) => p.email)
      .map((p) => ({ userId: p.id, name: p.full_name || p.email, email: p.email })),
  };
}

function isLead(ctx: TenderContext, email: string) {
  return !!ctx.lead && ctx.lead.email.toLowerCase() === email.toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY is not configured" }, 500);

    const payload = await req.json().catch(() => null);
    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    /* ---------------- 1. Database hook ---------------- */
    if (typeof payload?.notification_id === "string") {
      if (!HOOK_SECRET || req.headers.get("x-hook-secret") !== HOOK_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }

      const { data: n, error: nErr } = await db
        .from("notifications")
        .select("id, user_id, type, message, tender_id")
        .eq("id", payload.notification_id)
        .maybeSingle();
      if (nErr) return json({ error: nErr.message }, 500);
      if (!n) return json({ error: "Notification not found" }, 404);
      if (SKIP_EMAIL_TYPES.has(n.type)) return json({ skipped: `email for ${n.type} is sent directly` });

      const { data: profile } = await db.from("profiles").select("email, full_name").eq("id", n.user_id).maybeSingle();
      if (!profile?.email) return json({ skipped: "no recipient email" });
      const recipient: Person = { name: profile.full_name || profile.email, email: profile.email };

      let reason = TENDER_EMAIL_TYPES[n.type];
      if (reason && n.tender_id) {
        // Team members are saved straight after the tender; give them a moment
        // so the lead's email lists the whole team.
        if (n.type === "new_tender") await sleep(6000);

        const ctx = await loadTenderContext(db, n.tender_id);
        if (!ctx) return json({ skipped: "tender not found" });

        // Added to the team within minutes of creation → treat as "new tender".
        const created = ctx.tender.created_at ? Date.parse(ctx.tender.created_at) : 0;
        if (reason === "added" && Date.now() - created < 5 * 60_000) reason = "created";

        const email = buildTenderEmail({
          tender: ctx.tender,
          recipient,
          role: isLead(ctx, recipient.email) ? "lead" : "member",
          reason,
          lead: ctx.lead,
          team: ctx.team,
        });
        await sendEmail({
          to: recipient.email,
          ...email,
          replyTo: ctx.lead?.email,
          idempotencyKey: `notification-${n.id}`,
        });
        console.log(`Tender email (${reason}) sent to ${recipient.email} for ${n.tender_id}`);
        return json({ success: true, kind: "tender", reason });
      }

      // Simple notification email
      let replyTo: string | null = null;
      if (n.tender_id) {
        const { data: t } = await db.from("tenders").select("assigned_lead_email").eq("id", n.tender_id).maybeSingle();
        replyTo = t?.assigned_lead_email ?? null;
      }
      const link = n.tender_id ? `${APP_URL}/tenders/${n.tender_id}` : null;
      await sendEmail({
        to: recipient.email,
        subject: SUBJECTS[n.type] ?? "Tender notification",
        html: buildSimpleHtml(recipient.name, n.message, link),
        text: `${n.message}${link ? `\n\n${link}` : ""}`,
        replyTo,
        idempotencyKey: `notification-${n.id}`,
      });
      console.log(`Notification email sent to ${recipient.email} for ${n.id}`);
      return json({ success: true, kind: "simple" });
    }

    /* ---------------- 2. Signed-in user: dates changed ---------------- */
    if (typeof payload?.tender_id === "string" && payload?.action === "dates_changed") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: auth } = await userClient.auth.getUser();
      const user = auth?.user;
      if (!user) return json({ error: "Unauthorized" }, 401);

      const ctx = await loadTenderContext(db, payload.tender_id);
      if (!ctx) return json({ error: "Tender not found" }, 404);

      const { data: privileged } = await db.rpc("is_admin_or_bids_team", { _user_id: user.id });
      const callerIsLead = !!user.email && isLead(ctx, user.email);
      if (!privileged && !callerIsLead) return json({ error: "Not allowed to notify this tender's team" }, 403);

      const recipients: Array<Person & { userId: string | null; role: "lead" | "member" }> = [
        ...(ctx.lead ? [{ ...ctx.lead, userId: ctx.leadUserId, role: "lead" as const }] : []),
        ...ctx.team.map((p) => ({ ...p, role: "member" as const })),
      ];

      const version = ctx.tender.updated_at ?? new Date().toISOString();
      const sent: string[] = [];
      const failed: Array<{ email: string; error: string }> = [];
      for (const r of recipients) {
        try {
          const email = buildTenderEmail({
            tender: ctx.tender,
            recipient: r,
            role: r.role,
            reason: "dates_changed",
            lead: ctx.lead,
            team: ctx.team,
          });
          await sendEmail({
            to: r.email,
            ...email,
            replyTo: ctx.lead?.email,
            idempotencyKey: `dates-${ctx.tender.id}-${version}-${r.email}`,
          });
          sent.push(r.email);
        } catch (e) {
          failed.push({ email: r.email, error: (e as Error).message });
        }
        await sleep(300); // stay under Resend's rate limit
      }

      // In-app record (the hook skips emailing this type).
      const inApp = recipients
        .filter((r) => r.userId && sent.includes(r.email))
        .map((r) => ({
          user_id: r.userId!,
          type: "dates_changed",
          message: `The key dates for tender "${ctx.tender.title}" have been updated`,
          tender_id: ctx.tender.id,
        }));
      if (inApp.length) await db.from("notifications").insert(inApp);

      return json({ success: failed.length === 0, sent, failed });
    }

    return json({ error: "Unsupported request" }, 400);
  } catch (err) {
    console.error("send-notification-email error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
