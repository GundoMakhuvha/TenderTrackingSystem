import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get date 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const targetDate = threeDaysFromNow.toISOString().split("T")[0];

    // Find tenders due in 3 days that are not completed
    const { data: tenders, error } = await supabase
      .from("tenders")
      .select("id, title, assigned_lead_email, internal_completion_date")
      .eq("internal_completion_date", targetDate)
      .not("status", "in", '("completed","cancelled","rejected")');

    if (error) throw error;

    let inserted = 0;
    for (const tender of tenders || []) {
      // Find the user_id from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", tender.assigned_lead_email)
        .maybeSingle();

      if (profile) {
        await supabase.from("notifications").insert({
          user_id: profile.id,
          type: "due_date",
          message: `Tender "${tender.title}" is due in 3 days`,
          tender_id: tender.id,
        });
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
