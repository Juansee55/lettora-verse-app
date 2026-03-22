import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_GANG_NAMES = [
  "Sombras del Norte", "Los Inmortales", "Guardianes Oscuros", "Legión de Fuego",
  "Clan Nocturno", "Depredadores", "Furia Silenciosa", "Alianza Fantasma",
  "Bestias de Acero", "Lobos Digitales", "Red Phantom", "Cenizas Eternas",
  "Vanguardia Roja", "Eclipse Total", "Tormenta Negra",
];

const BOT_NAMES = [
  "Shadow-X", "NightBot", "IronFist", "CyberWolf", "StormBreaker",
  "PhantomAI", "DarkReaper", "TechHunter", "BlazeDroid", "VenomBot",
  "SteelClaw", "GhostUnit", "RageCore", "NeonByte", "ThunderAI",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action } = await req.json();

    // ─── CREATE NPC GANGS ───
    if (action === "create_npc_gangs") {
      // Check how many NPC gangs exist
      const { data: existingNpc } = await supabase
        .from("gangs")
        .select("id, name")
        .eq("is_npc", true);

      const existingCount = existingNpc?.length || 0;
      const maxNpc = 5;

      if (existingCount >= maxNpc) {
        return new Response(JSON.stringify({ message: "Max NPC gangs reached", count: existingCount }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toCreate = maxNpc - existingCount;
      const usedNames = (existingNpc || []).map((g: any) => g.name);
      const availableNames = BOT_GANG_NAMES.filter(n => !usedNames.includes(n));
      let created = 0;

      // We need a system user ID for created_by - use a deterministic UUID
      const systemUserId = "00000000-0000-0000-0000-000000000000";

      // Ensure system profile exists
      const { data: sysProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", systemUserId)
        .single();

      if (!sysProfile) {
        await supabase.from("profiles").insert({
          id: systemUserId,
          username: "system_bot",
          display_name: "🤖 Sistema",
          is_verified: true,
        });
      }

      for (let i = 0; i < toCreate && i < availableNames.length; i++) {
        const gangName = availableNames[i];

        const { data: newGang, error: gangErr } = await supabase
          .from("gangs")
          .insert({
            name: gangName,
            description: `Gang controlada por IA`,
            created_by: systemUserId,
            is_npc: true,
          })
          .select()
          .single();

        if (gangErr || !newGang) continue;

        // Add 3-5 bot members to the gang
        const botCount = 3 + Math.floor(Math.random() * 3);
        const shuffledBots = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, botCount);

        for (const botName of shuffledBots) {
          await supabase.from("gang_members").insert({
            gang_id: newGang.id,
            user_id: systemUserId,
            is_leader: false,
            is_bot: true,
          });

          await supabase.from("user_bots").insert({
            user_id: systemUserId,
            gang_id: newGang.id,
            bot_name: botName,
            is_active: true,
          });
        }

        // Make system user the leader
        await supabase.from("gang_members").insert({
          gang_id: newGang.id,
          user_id: systemUserId,
          is_leader: true,
          is_bot: false,
        });

        created++;
      }

      return new Response(JSON.stringify({ message: `Created ${created} NPC gangs`, created }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── NPC BOT ATTACKS (NPC gangs attack bases) ───
    if (action === "npc_attacks") {
      // Get all NPC gangs
      const { data: npcGangs } = await supabase
        .from("gangs")
        .select("id")
        .eq("is_npc", true);

      if (!npcGangs || npcGangs.length === 0) {
        return new Response(JSON.stringify({ message: "No NPC gangs", attacks: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: bases } = await supabase
        .from("territory_bases")
        .select("id, controlling_gang_id, hp, defender_id, defender_hp");

      if (!bases || bases.length === 0) {
        return new Response(JSON.stringify({ message: "No bases", attacks: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let attackCount = 0;
      const npcGangIds = npcGangs.map((g: any) => g.id);

      for (const npcGang of npcGangs) {
        // Find bases NOT controlled by this NPC gang
        const targetBases = bases.filter(
          (b: any) => b.controlling_gang_id !== npcGang.id
        );
        if (targetBases.length === 0) continue;

        // Pick a random target
        const target = targetBases[Math.floor(Math.random() * targetBases.length)];
        const damage = 1 + Math.floor(Math.random() * 2); // 1-2 damage

        if (target.defender_id && target.defender_hp > 0) {
          // Attack defender
          const newHp = Math.max(0, target.defender_hp - damage);
          await supabase
            .from("territory_bases")
            .update({
              defender_hp: newHp,
              ...(newHp <= 0 ? { defender_respawn_at: new Date(Date.now() + 4000).toISOString() } : {}),
            })
            .eq("id", target.id);
        } else {
          // Attack base directly
          const newHp = Math.max(0, target.hp - damage);
          if (newHp <= 0) {
            // Capture the base
            // End previous control history
            await supabase
              .from("base_control_history")
              .update({ ended_at: new Date().toISOString() })
              .eq("base_id", target.id)
              .is("ended_at", null);

            await supabase
              .from("territory_bases")
              .update({
                hp: 5,
                controlling_gang_id: npcGang.id,
                controlled_since: new Date().toISOString(),
                defender_id: null,
                defender_hp: 5,
              })
              .eq("id", target.id);

            // Start new control history
            await supabase.from("base_control_history").insert({
              base_id: target.id,
              gang_id: npcGang.id,
            });
          } else {
            await supabase
              .from("territory_bases")
              .update({ hp: newHp })
              .eq("id", target.id);
          }
        }

        attackCount++;
      }

      return new Response(JSON.stringify({ message: "NPC attacks completed", attacks: attackCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── USER BOT ATTACKS (helper bots in user gangs) ───
    if (action === "bot_attacks") {
      const { data: bots } = await supabase
        .from("user_bots")
        .select("id, user_id, gang_id")
        .eq("is_active", true);

      if (!bots || bots.length === 0) {
        return new Response(JSON.stringify({ message: "No active bots", attacks: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
        const enemyBases = bases.filter((b: any) => b.controlling_gang_id !== bot.gang_id);
        if (enemyBases.length === 0) continue;

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

    // ─── ALL BOTS CYCLE (runs all bot actions) ───
    if (action === "full_cycle") {
      // 1. Create NPC gangs if needed
      const createRes = await fetch(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") || "" },
        body: JSON.stringify({ action: "create_npc_gangs" }),
      });
      const createData = await createRes.json();

      // 2. NPC attacks
      const npcRes = await fetch(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") || "" },
        body: JSON.stringify({ action: "npc_attacks" }),
      });
      const npcData = await npcRes.json();

      // 3. User bot attacks
      const botRes = await fetch(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") || "" },
        body: JSON.stringify({ action: "bot_attacks" }),
      });
      const botData = await botRes.json();

      // 4. Check fort
      const fortRes = await fetch(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") || "" },
        body: JSON.stringify({ action: "check_fort" }),
      });
      const fortData = await fortRes.json();

      return new Response(JSON.stringify({
        message: "Full cycle completed",
        npc_gangs: createData,
        npc_attacks: npcData,
        bot_attacks: botData,
        fort: fortData,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHECK FORT ───
    if (action === "check_fort") {
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

          const sorted = Object.entries(gangMinutes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

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
