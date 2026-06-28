import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Star, Sparkles } from "lucide-react";
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
  rating_avg: number | null;
  ratings_count: number | null;
  is_featured: boolean | null;
  added_week: string | null;
}

export default function FreeBooks() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<FreeBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "featured" | "new">("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("free_books")
        .select("id,title,author,description,cover_url,language,genre,rating_avg,ratings_count,is_featured,added_week")
        .order("is_featured", { ascending: false })
        .order("added_week", { ascending: false })
        .limit(100);
      setBooks((data as FreeBook[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const filtered = books.filter((b) => {
    if (filter === "featured") return b.is_featured;
    if (filter === "new") return b.added_week && new Date(b.added_week) >= weekAgo;
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Biblioteca libre</h1>
            <p className="text-xs text-muted-foreground">Clásicos de dominio público · Lee y califica</p>
          </div>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {([
            { id: "all", label: "Todos" },
            { id: "featured", label: "✨ Destacados" },
            { id: "new", label: "🆕 Esta semana" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                filter === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">Sin libros para mostrar.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 px-4 pt-4">
          {filtered.map((b, i) => (
            <motion.button
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => navigate(`/free-books/${b.id}`)}
              className="text-left"
            >
              <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-muted relative">
                {b.cover_url ? (
                  <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">📖</div>
                )}
                {b.is_featured && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Destacado
                  </div>
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold line-clamp-1">{b.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{b.author}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  {(b.rating_avg ?? 0).toFixed(1)} · {b.ratings_count ?? 0}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <IOSBottomNav />
    </div>
  );
}