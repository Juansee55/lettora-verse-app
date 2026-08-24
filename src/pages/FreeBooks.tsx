import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ExternalLink,
  LibraryBig,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";

interface FreeBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  language: string | null;
  genre: string | null;
  source: string | null;
  source_url: string | null;
  license_note: string | null;
  rights_jurisdiction: string | null;
  content_format: string | null;
  rating_avg: number | null;
  ratings_count: number | null;
  is_featured: boolean | null;
  added_month: string | null;
  publish_at: string | null;
}

type Filter = "all" | "featured" | "new";

const sourceLabel = (source: string | null) => {
  if (!source) return "Fuente verificada";
  if (source === "gutenberg") return "Project Gutenberg";
  if (source === "bne") return "BNE Digital";
  return source;
};

const formatMonth = (value: string | null) => {
  if (!value) return "Selección editorial";
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
};

export default function FreeBooks() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<FreeBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("free_books")
        .select(
          "id,title,author,description,cover_url,language,genre,source,source_url,license_note,rights_jurisdiction,content_format,rating_avg,ratings_count,is_featured,added_month,publish_at",
        )
        .order("is_featured", { ascending: false })
        .order("publish_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (!active) return;
      if (queryError) {
        setError("No se pudo cargar la biblioteca. Intenta actualizar la página.");
        setBooks([]);
      } else {
        setError(null);
        setBooks((data as unknown as FreeBook[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthBooks = useMemo(
    () => books.filter((book) => (book.added_month ?? book.publish_at ?? "").slice(0, 7) === currentMonth),
    [books, currentMonth],
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    return books.filter((book) => {
      if (filter === "featured" && !book.is_featured) return false;
      if (filter === "new" && !currentMonthBooks.some((current) => current.id === book.id)) return false;
      if (!normalizedSearch) return true;
      return [book.title, book.author, book.genre, book.language]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(normalizedSearch));
    });
  }, [books, currentMonthBooks, filter, search]);

  const monthTitle = formatMonth(currentMonthBooks[0]?.added_month ?? currentMonthBooks[0]?.publish_at ?? null);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center transition-transform active:scale-95"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Biblioteca libre
            </h1>
            <p className="text-xs text-muted-foreground truncate">Obras verificadas · lectura dentro de Lettora</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-primary font-semibold">
            <ShieldCheck className="w-4 h-4" /> Curada
          </div>
        </div>
        <div className="px-4 pb-3">
          <label className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card px-3 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, autor o género"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Buscar libros gratuitos"
            />
          </label>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {([
            { id: "all", label: "Todos", icon: LibraryBig },
            { id: "featured", label: "Destacados", icon: Sparkles },
            { id: "new", label: "Este mes", icon: BookMarked },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border flex items-center gap-1.5 transition-transform active:scale-95 ${
                  filter === tab.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 pt-5 space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="rounded-2xl bg-primary/15 p-3 text-primary">
              <BookMarked className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-bold">Selección del mes</p>
              <h2 className="mt-1 text-lg font-black capitalize">{currentMonthBooks.length ? monthTitle : "Clásicos para descubrir"}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {currentMonthBooks.length
                  ? `${currentMonthBooks.length} ${currentMonthBooks.length === 1 ? "título nuevo" : "títulos nuevos"} listos para leer.`
                  : "Cada incorporación pasa por una revisión editorial y de procedencia."}
              </p>
            </div>
          </div>
          <div className="relative mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>La fuente y la jurisdicción revisada aparecen en cada ficha.</span>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-border/40 bg-card p-10 text-center text-muted-foreground">Cargando biblioteca…</div>
        ) : error ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-border/40 bg-card p-10 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">No hay libros para mostrar</p>
            <p className="mt-1 text-sm text-muted-foreground">Prueba con otra búsqueda o filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((book, index) => (
              <motion.article
                key={book.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="min-w-0"
              >
                <button onClick={() => navigate(`/free-books/${book.id}`)} className="block w-full text-left group">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border/30 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-active:scale-[0.98]">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={`Portada de ${book.title}`} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted text-primary">
                        <BookOpen className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 to-transparent" />
                    {book.is_featured && (
                      <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Destacado
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white">
                      <span className="rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm">{book.content_format === "plain_text" ? "Texto" : "Lectura"}</span>
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-300 text-yellow-300" /> {(book.rating_avg ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="line-clamp-2 text-sm font-bold leading-snug">{book.title}</div>
                    <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{book.author}</div>
                    <div className="mt-1 line-clamp-1 text-[11px] text-primary/80">{sourceLabel(book.source)}</div>
                  </div>
                </button>
                {book.source_url && (
                  <a
                    href={book.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Fuente oficial <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <IOSBottomNav />
    </div>
  );
}
