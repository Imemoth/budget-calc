import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, householdId, invitedBy, permissions } = await req.json();

    if (!email || !householdId || !invitedBy) {
      return new Response(
        JSON.stringify({ error: "Hiányzó paraméterek: email, householdId, invitedBy" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Meghívó rekord létrehozása a DB-ben
    const defaultPermissions = permissions ?? {
      income: true, expense: true, savings: true, categories: true, settings: false,
    };

    const { data: invite, error: insertErr } = await adminClient
      .from("household_invites")
      .insert({
        household_id: householdId,
        invited_email: email,
        invited_by: invitedBy,
        permissions: defaultPermissions,
      })
      .select("token")
      .single();

    if (insertErr || !invite) {
      return new Response(
        JSON.stringify({ error: insertErr?.message ?? "Nem sikerült létrehozni a meghívót." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Redirect URL összeállítása – az ?invite= paramétert az app olvassa ki
    // APP_ORIGIN env var prioritás: lokális fejlesztéskor ne localhost kerüljön az emailbe
    const origin =
      Deno.env.get("APP_ORIGIN") ??
      "https://koltsegradar.vercel.app";
    const redirectTo = `${origin}?invite=${invite.token}`;

    // Supabase meghívó email küldése (új fiók vagy magic link meglévőnek)
    const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    if (inviteErr) {
      return new Response(
        JSON.stringify({ error: inviteErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
