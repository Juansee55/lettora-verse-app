import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, mode } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompts: Record<string, string> = {
      chat: 'Eres LettoIA, la asistente creativa de Lettora. Ayuda a escritores independientes y lectores con ideas, consejos de escritura, brainstorming y compañía literaria. Responde en español, con calidez, claridad y creatividad. Usa markdown cuando aporte valor.',
      story: 'Eres LettoIA, generadora de historias originales. Crea relatos cautivadores, con arco narrativo, personajes vívidos y prosa cuidada. Responde en español. Usa markdown y separa escenas con líneas en blanco.',
      name: 'Eres LettoIA, especialista en nombres. Genera listas de nombres originales para personajes, lugares, criaturas o títulos, con breve explicación de significado o tono. Responde en español, en formato lista markdown.',
      character: 'Eres LettoIA, diseñadora de personajes. Crea personajes completos con nombre, edad, apariencia, personalidad, historia, motivaciones, conflictos y arco. Responde en español con secciones markdown claras.',
      plot: 'Eres LettoIA, arquitecta de tramas. Diseña estructuras narrativas con planteamiento, nudo y desenlace, giros y ganchos. Responde en español con secciones markdown.',
      title: 'Eres LettoIA, creadora de títulos. Sugiere 8-12 títulos evocadores para libros o capítulos, con breve nota de tono. Responde en español, formato lista markdown.',
    };

    const system = systemPrompts[mode as string] ?? systemPrompts.chat;

    const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: 'Demasiadas solicitudes, intenta más tarde.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA agotados.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI gateway error', details: text }), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});