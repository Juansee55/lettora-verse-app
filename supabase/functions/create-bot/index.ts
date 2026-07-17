import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const READER_NAMES = ["Lucía","Mateo","Sofía","Diego","Valentina","Sebastián","Camila","Nicolás","Isabella","Emiliano","Renata","Julián","Martina","Thiago","Antonella","Bruno","Regina","Facundo","Alma","Iker"];
const WRITER_LAST = ["Aurora","Vela","Rojas","Nocturno","Aldana","Luna","Cardoza","Solar","Vega","Estrella","Rivas","Cielo","Prisma","Fenix","Zafiro"];
const ADMIN_PREFIX = ["Guardia","Vigía","Centinela","Custodio","Árbitro"];
const BIOS_USER = ["Ávido lector de novelas.","Escribo cuando la noche llama.","Historias cortas, emociones grandes.","Cazador de metáforas.","Fan de la fantasía y el misterio."];
const BIOS_ADMIN = ["🛡️ Bot moderador oficial de Lettora.","🤖 Vigilando el contenido 24/7.","Protejo la comunidad lectora."];

const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { botType = "user", count = 1 } = await req.json().catch(() => ({}));
    if (!["admin","user"].includes(botType)) return new Response(JSON.stringify({ error: "invalid botType" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const n = Math.max(1, Math.min(10, Number(count) || 1));
    const created: any[] = [];

    for (let i = 0; i < n; i++) {
      const first = rand(READER_NAMES);
      const last = rand(WRITER_LAST);
      const displayName = botType === "admin"
        ? `${rand(ADMIN_PREFIX)} ${last}`
        : `${first} ${last}`;
      const baseUser = botType === "admin"
        ? `bot_admin_${slug(last)}_${Math.floor(Math.random()*9999)}`
        : `bot_${slug(first)}${slug(last)}_${Math.floor(Math.random()*9999)}`;
      const email = `${baseUser}@bots.lettora.local`;
      const password = crypto.randomUUID() + crypto.randomUUID();

      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { is_bot: true, bot_type: botType },
      });
      if (createErr || !newUser?.user) {
        console.error("createUser failed", createErr);
        continue;
      }

      const uid = newUser.user.id;
      await admin.from("profiles").upsert({
        id: uid,
        username: baseUser,
        display_name: displayName,
        bio: botType === "admin" ? rand(BIOS_ADMIN) : rand(BIOS_USER),
        is_verified: botType === "admin",
        is_bot: true,
        bot_type: botType,
      });

      if (botType === "admin") {
        await admin.from("user_roles").insert({ user_id: uid, role: "moderator" }).select();
      }

      created.push({ id: uid, username: baseUser, display_name: displayName, bot_type: botType });
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-bot error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});