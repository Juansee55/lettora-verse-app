import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENRES = ["Fantasía","Romance","Ciencia ficción","Misterio","Terror","Aventura","Drama","Poesía"];

async function askGemini(prompt: string, system: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`gateway ${r.status}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service);

    // Auth: admin JWT OR cron secret
    const cron = req.headers.get("x-cron-secret");
    const cronOk = cron && cron === Deno.env.get("CRON_SECRET");
    if (!cronOk) {
      const auth = req.headers.get("Authorization");
      if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const uc = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
      const { data: ud } = await uc.auth.getUser();
      if (!ud?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: ud.user.id, _role: "admin" });
      if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action = "cycle" } = await req.json().catch(() => ({}));

    const { data: bots } = await sb.from("profiles").select("id, display_name").eq("is_bot", true).eq("bot_type", "user");
    if (!bots || bots.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No hay bots usuarios" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stats = { reads: 0, likes: 0, microstories: 0, books: 0 };

    // 1. READ BOOKS — every bot increments reads on 1-3 random books
    if (action === "cycle" || action === "read") {
      const { data: books } = await sb.from("books").select("id, reads_count, likes_count").eq("status","published").limit(200);
      if (books && books.length) {
        for (const bot of bots) {
          const nReads = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < nReads; i++) {
            const b: any = books[Math.floor(Math.random() * books.length)];
            await sb.from("books").update({ reads_count: (b.reads_count || 0) + 1 }).eq("id", b.id);
            stats.reads++;
            if (Math.random() < 0.3) {
              const { error } = await sb.from("likes").insert({ user_id: bot.id, likeable_type: "book", likeable_id: b.id });
              if (!error) stats.likes++;
            }
          }
        }
      }
    }

    // 2. PUBLISH MICROSTORY — random 40% of bots each run
    if (action === "cycle" || action === "microstory") {
      for (const bot of bots) {
        if (Math.random() > 0.4) continue;
        try {
          const text = await askGemini(
            `Escribe un microrrelato original en español de 280 a 500 caracteres. Devuelve SOLO el texto del relato, sin título ni comentarios.`,
            `Eres un escritor creativo. Escribes historias breves impactantes.`,
          );
          const content = text.trim().slice(0, 800);
          const title = content.split(/[.!?]/)[0].slice(0, 60);
          await sb.from("microstories").insert({ author_id: bot.id, title, content, max_length: 800 });
          stats.microstories++;
        } catch (e) { console.error("micro fail", e); }
      }
    }

    // 3. PUBLISH BOOK — random 10% chance per bot
    if (action === "cycle" || action === "book") {
      for (const bot of bots) {
        if (Math.random() > 0.1) continue;
        try {
          const raw = await askGemini(
            `Genera un libro corto en español. Responde en JSON puro con esta forma:
{"title":"...","description":"...","genre":"...","chapter_title":"...","chapter_content":"..."}
El género debe ser uno de: ${GENRES.join(", ")}. La descripción máximo 200 chars. El capítulo entre 800 y 1500 chars.`,
            `Eres un escritor. Devuelves SOLO JSON válido, sin markdown.`,
          );
          const clean = raw.replace(/```json|```/g, "").trim();
          const obj = JSON.parse(clean);
          const { data: book } = await sb.from("books").insert({
            author_id: bot.id,
            title: String(obj.title).slice(0, 100),
            description: String(obj.description).slice(0, 300),
            genre: GENRES.includes(obj.genre) ? obj.genre : GENRES[0],
            status: "published",
            ai_generated: true,
            age_rating: "all",
          }).select().single();
          if (book) {
            await sb.from("chapters").insert({
              book_id: book.id,
              title: String(obj.chapter_title).slice(0, 100),
              content: String(obj.chapter_content).slice(0, 5000),
              chapter_number: 1,
              is_published: true,
              word_count: String(obj.chapter_content).split(/\s+/).length,
            });
            stats.books++;
          }
        } catch (e) { console.error("book fail", e); }
      }
    }

    return new Response(JSON.stringify({ ok: true, stats, bots: bots.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bot-user-actions error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});