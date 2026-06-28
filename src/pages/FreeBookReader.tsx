import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FreeBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  content: string | null;
  content_url: string | null;
  rating_avg: number | null;
  ratings_count: number | null;
}

export default function FreeBookReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<FreeBook | null>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [myRating, setMyRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const { data } = await supabase.from("free_books").select("*").eq("id", id).maybeSingle();
      if (!data) { setLoading(false); return; }
      setBook(data as FreeBook);
      // Increment reads (best-effort, ignore RLS error since column is admin-only — that's OK)
      try {
        await supabase.rpc("admin_update_book_stats", { p_book_id: id, p_likes_delta: 0, p_reads_delta: 1 });
      } catch { /* not admin, ignore */ }

      if (data.content) {
        setText(data.content);
      } else if (data.content_url) {
        try {
          const proxy = `https://r.jina.ai/${data.content_url}`;
          const res = await fetch(proxy);
          const body = await res.text();
          setText(body || "No se pudo cargar el contenido. Abre el enlace original.");
        } catch {
          setText("No se pudo cargar el contenido remoto. Verifica tu conexión.");
        }
      }

      if (user) {
        const { data: r } = await supabase
          .from("free_book_ratings")
          .select("rating,review")
          .eq("book_id", id!)
          .eq("user_id", user.id)
          .maybeSingle();
        if (r) { setMyRating(r.rating); setReview(r.review ?? ""); }
      }
      setLoading(false);
    })();
  }, [id]);

  const submitRating = async (stars: number) => {
    if (!userId) { toast.error("Inicia sesión para calificar"); return; }
    setMyRating(stars);
    const { error } = await supabase
      .from("free_book_ratings")
      .upsert({ book_id: id!, user_id: userId, rating: stars, review }, { onConflict: "book_id,user_id" });
    if (error) toast.error("No se pudo guardar la calificación");
    else toast.success("¡Gracias por calificar!");
  };

  const paragraphs = useMemo(() => {
    if (!text) return [];
    // Strip HTML tags if present, keep paragraph breaks
    const cleaned = text.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
    const plain = cleaned.replace(/<\/p>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    return plain.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, 800);
  }, [text]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Cargando…</div>;
  if (!book) return <div className="p-10 text-center">Libro no encontrado.</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{book.title}</div>
            <div className="text-[11px] text-muted-foreground truncate">{book.author}</div>
          </div>
          <button onClick={() => setFontSize((s) => Math.max(12, s - 2))} className="w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
          <button onClick={() => setFontSize((s) => Math.min(28, s + 2))} className="w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-5 py-6 leading-relaxed" style={{ fontSize }}>
        {book.description && <p className="text-muted-foreground italic mb-6">{book.description}</p>}
        {paragraphs.length === 0 ? (
          <p className="text-muted-foreground">
            Este libro aún no tiene contenido cargado.{" "}
            {book.content_url && (
              <a href={book.content_url} target="_blank" rel="noreferrer" className="text-primary underline">
                Leer fuente original
              </a>
            )}
          </p>
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className="mb-4">{p}</p>
          ))
        )}
      </article>

      <section className="max-w-2xl mx-auto px-5 mt-6 border-t border-border/40 pt-6">
        <h3 className="text-base font-bold mb-2">Tu calificación</h3>
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => submitRating(n)} aria-label={`${n} estrellas`}>
              <Star className={`w-7 h-7 ${n <= myRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          onBlur={() => myRating > 0 && submitRating(myRating)}
          placeholder="Escribe una reseña corta (opcional)"
          className="w-full bg-card border border-border/50 rounded-2xl p-3 text-sm"
          rows={3}
          maxLength={500}
        />
        <div className="text-[11px] text-muted-foreground mt-2">
          Promedio: {(book.rating_avg ?? 0).toFixed(1)} ★ · {book.ratings_count ?? 0} reseñas
        </div>
      </section>
    </div>
  );
}