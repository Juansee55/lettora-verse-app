import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSpatialNavigation } from "@/hooks/useSpatialNavigation";
import { BookOpen, Sparkles, Flame, Search, Settings } from "lucide-react";

type Book = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  genre: string | null;
  reads_count: number | null;
  likes_count: number | null;
};

const TVHome = () => {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<Book[]>([]);
  const [recent, setRecent] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useSpatialNavigation(true);

  useEffect(() => {
    (async () => {
      const [t, r] = await Promise.all([
        supabase
          .from("books")
          .select("id,title,description,cover_url,genre,reads_count,likes_count")
          .eq("status", "published")
          .order("reads_count", { ascending: false })
          .limit(12),
        supabase
          .from("books")
          .select("id,title,description,cover_url,genre,reads_count,likes_count")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(12),
      ]);
      setTrending((t.data as Book[]) || []);
      setRecent((r.data as Book[]) || []);
      setLoading(false);
    })();
  }, []);

  const openBook = (id: string) => navigate(`/tv/book/${id}`);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0118] via-[#13072a] to-[#1f0a3d] text-white overflow-x-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-16 py-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center shadow-[0_0_40px_rgba(167,139,250,0.6)]">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lettora TV</h1>
            <p className="text-sm text-white/60">Lectura para tu pantalla grande</p>
          </div>
        </div>
        <div className="flex gap-4">
          <TvButton onClick={() => navigate("/tv/search")} icon={<Search className="w-6 h-6" />}>Buscar</TvButton>
          <TvButton onClick={() => navigate("/tv/settings")} icon={<Settings className="w-6 h-6" />}>Ajustes</TvButton>
        </div>
      </header>

      {/* Hero */}
      {trending[0] && (
        <section className="px-16 mb-12">
          <Hero book={trending[0]} onOpen={openBook} />
        </section>
      )}

      {/* Rows */}
      <section className="px-16 pb-24 space-y-12">
        <Row title="Tendencias ahora" icon={<Flame className="w-6 h-6 text-orange-400" />} books={trending} onOpen={openBook} loading={loading} />
        <Row title="Recién publicados" icon={<Sparkles className="w-6 h-6 text-violet-300" />} books={recent} onOpen={openBook} loading={loading} />
      </section>

      {/* Hint */}
      <div className="fixed bottom-6 right-8 text-xs text-white/40">
        Usa el mando: ◀ ▲ ▼ ▶ para navegar · OK para abrir · Atrás para volver
      </div>
    </div>
  );
};

const TvButton = ({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode }) => (
  <button
    data-tv-focusable
    onClick={onClick}
    className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-lg font-medium outline-none transition-all focus:bg-white/15 focus:border-violet-400 focus:scale-[1.05] focus:shadow-[0_0_30px_rgba(167,139,250,0.5)]"
  >
    {icon}
    {children}
  </button>
);

const Hero = ({ book, onOpen }: { book: Book; onOpen: (id: string) => void }) => (
  <div className="relative h-[420px] rounded-[2rem] overflow-hidden border border-white/10">
    {book.cover_url && (
      <img src={book.cover_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-40" />
    )}
    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0118] via-[#0a0118]/80 to-transparent" />
    <div className="relative z-10 h-full flex items-center gap-10 p-12">
      {book.cover_url && (
        <img src={book.cover_url} alt="" className="w-[240px] h-[360px] object-cover rounded-2xl shadow-2xl shadow-black/60" />
      )}
      <div className="flex-1">
        <p className="text-violet-300 uppercase tracking-[0.3em] text-sm mb-3">Destacado</p>
        <h2 className="text-5xl font-bold mb-4 leading-tight">{book.title}</h2>
        <p className="text-white/70 text-lg max-w-2xl line-clamp-3 mb-6">{book.description}</p>
        <div className="flex gap-4">
          <button
            data-tv-focusable
            onClick={() => onOpen(book.id)}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-lg font-semibold outline-none transition-all focus:scale-[1.06] focus:shadow-[0_0_50px_rgba(217,70,239,0.6)]"
          >
            ▶ Leer ahora
          </button>
        </div>
      </div>
    </div>
  </div>
);

const Row = ({
  title, icon, books, onOpen, loading,
}: { title: string; icon: React.ReactNode; books: Book[]; onOpen: (id: string) => void; loading: boolean }) => (
  <div>
    <div className="flex items-center gap-3 mb-5">
      {icon}
      <h3 className="text-2xl font-semibold">{title}</h3>
    </div>
    <div className="flex gap-6 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-none">
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[200px] h-[300px] rounded-2xl bg-white/5 animate-pulse shrink-0" />
          ))
        : books.map((b) => (
            <button
              key={b.id}
              data-tv-focusable
              onClick={() => onOpen(b.id)}
              className="shrink-0 w-[200px] text-left outline-none group"
            >
              <div className="w-[200px] h-[300px] rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition-all group-focus:scale-[1.08] group-focus:border-violet-400 group-focus:shadow-[0_0_40px_rgba(167,139,250,0.6)]">
                {b.cover_url ? (
                  <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-white/40">
                    <BookOpen className="w-12 h-12" />
                  </div>
                )}
              </div>
              <p className="mt-3 text-base font-medium line-clamp-1">{b.title}</p>
              {b.genre && <p className="text-sm text-white/50 line-clamp-1">{b.genre}</p>}
            </button>
          ))}
    </div>
  </div>
);

export default TVHome;