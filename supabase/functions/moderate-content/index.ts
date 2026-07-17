import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPAM_REGEX = /(https?:\/\/\S+.*){3,}|(.)\1{9,}/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service);

    // Require an admin caller (via user JWT) OR the CRON_SECRET header
    const cron = req.headers.get("x-cron-secret");
    const cronOk = cron && cron === Deno.env.get("CRON_SECRET");
    if (!cronOk) {
      const auth = req.headers.get("Authorization");
      if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
      if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pick the oldest bot admin as the actor
    const { data: botAdmin } = await sb.from("profiles").select("id").eq("is_bot", true).eq("bot_type", "admin").order("created_at").limit(1).maybeSingle();
    const actorId = botAdmin?.id ?? null;

    const { data: bannedRows } = await sb.from("banned_words").select("word");
    const bannedWords = (bannedRows || []).map((r: any) => (r.word as string).toLowerCase());

    const isBadText = (t: string | null | undefined) => {
      if (!t) return null;
      const lower = t.toLowerCase();
      const hit = bannedWords.find((w) => lower.includes(w));
      if (hit) return `palabra prohibida: "${hit}"`;
      if (SPAM_REGEX.test(t)) return "spam detectado";
      return null;
    };

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const notify = async (userId: string, reason: string, contentType: string) => {
      if (!userId) return;
      await sb.from("notifications").insert({
        user_id: userId,
        type: "moderation",
        content: `Un bot administrador eliminó tu ${contentType} por incumplir las reglas (${reason}).`,
        from_user_id: actorId,
      });
    };

    const stats = { microstories: 0, comments: 0, literary_posts: 0, warned: 0 };

    const { data: micros } = await sb.from("microstories").select("id, author_id, title, content").gte("created_at", since).limit(500);
    for (const m of micros || []) {
      const reason = isBadText(m.title) || isBadText(m.content);
      if (reason) {
        await sb.from("microstories").delete().eq("id", m.id);
        await notify(m.author_id, reason, "microrrelato");
        stats.microstories++;
      }
    }

    const { data: cmts } = await sb.from("comments").select("id, user_id, content").gte("created_at", since).limit(500);
    for (const c of cmts || []) {
      const reason = isBadText(c.content);
      if (reason) {
        await sb.from("comments").delete().eq("id", c.id);
        await notify(c.user_id, reason, "comentario");
        stats.comments++;
      }
    }

    const { data: posts } = await sb.from("literary_posts").select("id, author_id, content").gte("created_at", since).limit(500);
    for (const p of posts || []) {
      const reason = isBadText(p.content);
      if (reason) {
        await sb.from("literary_posts").delete().eq("id", p.id);
        await notify(p.author_id, reason, "publicación literaria");
        stats.literary_posts++;
      }
    }

    return new Response(JSON.stringify({ ok: true, stats, actor: actorId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-content error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});