import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "noreply@tippfocus.co.za";
const FROM_NAME = Deno.env.get("SENDGRID_FROM_NAME") ?? "TIPP Focus Tenders";
const HOOK_SECRET = Deno.env.get("NOTIFY_HOOK_SECRET");
const APP_URL = Deno.env.get("APP_URL") ?? "https://id-preview--049fe298-cdd9-4368-85ce-b9402d2ce94e.lovable.app";

const SUBJECTS: Record<string, string> = {
  new_tender: "New tender assigned to you",
  reassignment: "A tender has been reassigned to you",
  team_assignment: "You have been added to a tender team",
  status_change: "Tender status updated",
  due_date: "Tender due soon",
  approval_required: "A tender needs your approval",
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(name: string, message: string, link: string | null) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin:0 0 16px;">TIPP Focus &middot; Tender Tracking</p>
    <h1 style="font-size:20px;margin:0 0 16px;">Hi ${escapeHtml(name)},</h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">${escapeHtml(message)}</p>
    ${
      link
        ? `<a href="${link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;">View tender</a>`
        : ""
    }
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
    <p style="font-size:12px;color:#6b7280;margin:0;">You are receiving this because you are involved in this tender in the TIPP Focus Tender Tracking System.</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!SENDGRID_API_KEY) return json({ error: "SENDGRID_API_KEY is not configured" }, 500);

    if (!HOOK_SECRET || req.headers.get("x-hook-secret") !== HOOK_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => null);
    const notificationId = payload?.notification_id;
    if (typeof notificationId !== "string" || notificationId.length === 0) {
      return json({ error: "notification_id is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: notification, error: nErr } = await supabase
      .from("notifications")
      .select("id, user_id, type, message, tender_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (nErr) return json({ error: nErr.message }, 500);
    if (!notification) return json({ error: "Notification not found" }, 404);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", notification.user_id)
      .maybeSingle();

    if (!profile?.email) return json({ skipped: "no recipient email" });

    const link = notification.tender_id ? `${APP_URL}/tenders/${notification.tender_id}` : null;
    const subject = SUBJECTS[notification.type] ?? "Tender notification";

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: profile.email }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          { type: "text/plain", value: `${notification.message}${link ? `\n\n${link}` : ""}` },
          {
            type: "text/html",
            value: buildHtml(profile.full_name || profile.email, notification.message, link),
          },
        ],
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`SendGrid failed [${res.status}]: ${details}`);
      return json({ error: "SendGrid request failed", status: res.status, details }, res.status);
    }

    console.log(`Email sent to ${profile.email} for notification ${notification.id}`);
    return json({ success: true });
  } catch (err) {
    console.error("send-notification-email error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
