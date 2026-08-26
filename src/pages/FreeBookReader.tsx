import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, ExternalLink, Minus, Plus, ShieldCheck, Star } from "lucide-react";
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
  source: string | null;
  source_url: string | null;
  license_note: string | null;
  rights_jurisdiction: string | null;
  content_format: string | null;
  rating_avg: number | null;
  ratings_count: number | null;
}

const sourceLabel = (source: string | null) => {
  if (source === "gutenberg") return "Project Gutenberg";
  if (source === "bne") return "BNE Digital";
  return source || "Fuente verificada";
};

const normalizeText = (raw: string) => {
  const withoutMarkup = raw
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/\r\n?/g, "\n");

  const startMarker = withoutMarkup.search(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const endMarker = withoutMarkup.search(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const start = startMarker >= 0 ? withoutMarkup.indexOf("\n", startMarker) + 1 : 0;
  const end = endMarker > start ? endMarker : withoutMarkup.length;

  return withoutMarkup
    .slice(start, end)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const getProgressKey = (bookId: string) => `lettora_free_book_progress:${bookId}`;

export default function FreeBookReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<FreeBook | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [myRating, setMyRating] = useState(0);
  const [review, setReview] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!id) return;
    const stored = Number(localStorage.getItem(getProgressKey(id)) ?? 0);
    if (Number.isFinite(stored)) setProgress(Math.min(100, Math.max(0, stored)));
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("free_books")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      setUserId(user?.id ?? null);
      if (error || !data) {
        setBook(null);
        setLoading(false);
        return;
      }

      const nextBook = data as unknown as FreeBook;
      setBook(nextBook);
      setLoading(false);
      setContentLoading(true);
      setContentError(null);

      try {
        if (nextBook.content) {
          setText(normalizeText(nextBook.content));
        } else if (nextBook.content_url) {
          const response = await fetch(`https://r.jina.ai/${nextBook.content_url}`);
          if (!response.ok) throw new Error("No se pudo recuperar el texto");
          setText(normalizeText(await response.text()));
        } else {
          setContentError("Este libro todavía no tiene un texto legible cargado.");
        }
      } catch {
        if (active) setContentError("No se pudo cargar el texto. Puedes abrir la fuente oficial para leerlo.");
      } finally {
        if (active) setContentLoading(false);
      }

      try {
        await supabase.rpc("admin_update_book_stats", { p_book_id: id, p_likes_delta: 0, p_reads_delta: 1 });
      } catch {
        // Las estadísticas son best-effort para lectores no administradores.
      }

      if (user) {
        const { data: rating } = await supabase
          .from("free_book_ratings")
          .select("rating,review")
          .eq("book_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (active && rating) {
          setMyRating(rating.rating);
          setReview(rating.review ?? "");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const paragraphs = useMemo(() => {
    if (!text) return [];
    const normalized = text.replace(/[ \t]+\n/g, "\n").trim();
    return (normalized.includes("\n\n") ? normalized.split(/\n\s*\n/) : normalized.split(/\n+/))
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [text]);

  const submitRating = async (stars: number) => {
    if (!userId || !id) {
      toast.error("Inicia sesión para calificar");
      return;
    }
    setMyRating(stars);
    const { error } = await supabase
      .from("free_book_ratings")
      .upsert({ book_id: id, user_id: userId, rating: stars, review }, { onConflict: "book_id,user_id" });
    if (error) toast.error("No se pudo guardar la calificación");
    else toast.success("¡Gracias por calificar!");
  };

  const saveProgress = (event: React.UIEvent<HTMLElement>) => {
    if (!id) return;
    const element = event.currentTarget;
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) return;
    const value = Math.round((element.scrollTop / maxScroll) * 100);
    setProgress(value);
    localStorage.setItem(getProgressKey(id), String(value));
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">Cargando libro…</div>;
  if (!book) return <div className="p-10 text-center">Libro no encontrado.</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center transition-transform active:scale-95" aria-label="Volver">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{book.title}</div>
            <div className="text-[11px] text-muted-foreground truncate">{book.author}</div>
          </div>
          <button onClick={() => setFontSize((size) => Math.max(14, size - 2))} className="w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center" aria-label="Reducir texto"><Minus className="w-3.5 h-3.5" /></button>
          <button onClick={() => setFontSize((size) => Math.min(28, size + 2))} className="w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center" aria-label="Aumentar texto"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="h-1 bg-muted"><div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} /></div>
      </header>

      <main className="max-w-2xl mx-auto px-5">
        <section className="py-6 border-b border-border/40">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"><ShieldCheck className="w-4 h-4" /> Lectura verificada</div>
          <h1 className="mt-2 text-2xl font-black leading-tight">{book.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
          {book.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground italic">{book.description}</p>}
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-3.5 text-xs leading-relaxed">
            <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><strong>{sourceLabel(book.source)}</strong><br />{book.license_note || "Consulta la fuente oficial para conocer las condiciones de uso."}{book.rights_jurisdiction ? ` Jurisdicción revisada: ${book.rights_jurisdiction}.` : ""}</div></div>
            {book.source_url && <a href={book.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline">Abrir ficha oficial <ExternalLink className="w-3.5 h-3.5" /></a>}
          </div>
        </section>

        <article onScroll={saveProgress} className="max-h-[68vh] overflow-y-auto py-7 pr-1 leading-relaxed" style={{ fontSize }}>
          {contentLoading ? (
            <div className="py-10 text-center text-muted-foreground">Preparando el texto para leer…</div>
          ) : contentError ? (
            <div className="rounded-2xl border border-border/50 bg-card p-5 text-center text-sm text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-3 text-primary" />
              <p>{contentError}</p>
              {book.source_url && <a href={book.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-semibold text-primary hover:underline">Leer en la fuente oficial <ExternalLink className="w-3.5 h-3.5" /></a>}
            </div>
          ) : paragraphs.length === 0 ? (
            <p className="text-muted-foreground">No hay contenido legible disponible todavía.</p>
          ) : (
            paragraphs.map((paragraph, index) => <p key={`${book.id}-${index}`} className="mb-6 leading-[1.85] break-words">{paragraph}</p>)
          )}
        </article>

        <section className="border-t border-border/40 pt-6">
          <h2 className="text-base font-bold mb-2">Tu calificación</h2>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => void submitRating(star)} aria-label={`${star} estrellas`}><Star className={`w-7 h-7 ${star <= myRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} /></button>)}
          </div>
          <textarea value={review} onChange={(event) => setReview(event.target.value)} onBlur={() => myRating > 0 && void submitRating(myRating)} placeholder="Escribe una reseña corta (opcional)" className="w-full bg-card border border-border/50 rounded-2xl p-3 text-sm" rows={3} maxLength={500} />
          <div className="text-[11px] text-muted-foreground mt-2">Promedio: {(book.rating_avg ?? 0).toFixed(1)} ★ · {book.ratings_count ?? 0} reseñas</div>
        </section>
      </main>
    </div>
  );
}
