import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action } = await req.json();

    if (action === "bot_attacks") {
      // Get all active bots
      const { data: bots } = await supabase
        .from("user_bots")
        .select("id, user_id, gang_id")
        .eq("is_active", true);

      if (!bots || bots.length === 0) {
        return new Response(JSON.stringify({ message: "No active bots", attacks: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all bases
      const { data: bases } = await supabase
        .from("territory_bases")
        .select("id, controlling_gang_id");

      if (!bases || bases.length === 0) {
        return new Response(JSON.stringify({ message: "No bases", attacks: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let attackCount = 0;

      for (const bot of bots) {
        // Find an enemy base to attack (not owned by bot's gang)
        const enemyBases = bases.filter(b => b.controlling_gang_id !== bot.gang_id);
        if (enemyBases.length === 0) continue;

        // Pick a random enemy base
        const target = enemyBases[Math.floor(Math.random() * enemyBases.length)];

        const { data } = await supabase.rpc("bot_auto_attack", {
          p_bot_id: bot.id,
          p_base_id: target.id,
          p_gang_id: bot.gang_id,
        });

        if (data?.success) attackCount++;
      }

      return new Response(JSON.stringify({ message: "Bot attacks completed", attacks: attackCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_fort") {
      // Check if there's an active Fort event
      const { data: activeFort } = await supabase
        .from("fort_events")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      const now = new Date();

      if (activeFort) {
        const startedAt = new Date(activeFort.started_at);
        const elapsed = (now.getTime() - startedAt.getTime()) / (1000 * 60);

        if (elapsed >= 30) {
          // Fort ended - calculate top 3 gangs by control time during the Fort
          const { data: history } = await supabase
            .from("base_control_history")
            .select("gang_id, started_at, ended_at");

          const fortStart = startedAt;
          const fortEnd = now;
          const gangMinutes: Record<string, number> = {};

          (history || []).forEach((h: any) => {
            const start = new Date(h.started_at);
            const end = h.ended_at ? new Date(h.ended_at) : fortEnd;

            const effectiveStart = start < fortStart ? fortStart : start;
            const effectiveEnd = end > fortEnd ? fortEnd : end;

            if (effectiveEnd > effectiveStart) {
              const minutes = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60);
              gangMinutes[h.gang_id] = (gangMinutes[h.gang_id] || 0) + minutes;
            }
          });

          // Get top 3
          const sorted = Object.entries(gangMinutes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

          // Get gang names
          const gangIds = sorted.map(([id]) => id);
          const { data: gangs } = await supabase
            .from("gangs")
            .select("id, name, photo_url")
            .in("id", gangIds);

          const topGangs = sorted.map(([gangId, minutes], i) => {
            const gang = (gangs || []).find((g: any) => g.id === gangId);
            return {
              rank: i + 1,
              gang_id: gangId,
              gang_name: gang?.name || "Desconocida",
              gang_photo: gang?.photo_url || null,
              control_minutes: Math.round(minutes * 10) / 10,
            };
          });

          // End the fort
          await supabase
            .from("fort_events")
            .update({ status: "ended", ended_at: now.toISOString(), top_gangs: topGangs })
            .eq("id", activeFort.id);

          return new Response(JSON.stringify({ message: "Fort ended", top_gangs: topGangs }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "Fort still active", minutes_remaining: Math.round(30 - elapsed) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if we should start a new Fort (every 2 hours)
      const { data: lastFort } = await supabase
        .from("fort_events")
        .select("ended_at")
        .eq("status", "ended")
        .order("ended_at", { ascending: false })
        .limit(1)
        .single();

      let shouldStart = true;
      if (lastFort?.ended_at) {
        const lastEnd = new Date(lastFort.ended_at);
        const hoursSince = (now.getTime() - lastEnd.getTime()) / (1000 * 60 * 60);
        shouldStart = hoursSince >= 2;
      }

      if (shouldStart) {
        const { data: newFort } = await supabase
          .from("fort_events")
          .insert({ status: "active" })
          .select()
          .single();

        return new Response(JSON.stringify({ message: "Fort started!", fort_id: newFort?.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "No fort needed yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bot-actions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
