import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSpatialNavigation } from "@/hooks/useSpatialNavigation";
import { ArrowLeft, BookOpen, Eye, Heart } from "lucide-react";

const TVBook = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);

  useSpatialNavigation(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: b } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
      setBook(b);
      const { data: ch } = await supabase
        .from("chapters")
        .select("id, title, chapter_number")
        .eq("book_id", id)
        .order("chapter_number", { ascending: true });
      setChapters(ch || []);
    })();
  }, [id]);

  if (!book) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0a0118] text-white">
        <div className="animate-pulse">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#13072a] to-[#1f0a3d] text-white">
      <header className="px-16 py-8 flex items-center gap-6">
        <button
          data-tv-focusable
          onClick={() => navigate(-1)}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:bg-white/15 focus:border-violet-400 focus:scale-105 transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-semibold">Lettora TV</h1>
      </header>

      <section className="px-16 grid grid-cols-[280px_1fr] gap-12 mb-12">
        <div className="w-[280px] h-[420px] rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="grid place-items-center h-full text-white/40">
              <BookOpen className="w-16 h-16" />
            </div>
          )}
        </div>
        <div>
          <p className="text-violet-300 uppercase tracking-[0.3em] text-sm mb-3">{book.genre || "Libro"}</p>
          <h2 className="text-5xl font-bold mb-4">{book.title}</h2>
          <div className="flex gap-6 text-white/70 mb-6">
            <span className="flex items-center gap-2"><Eye className="w-5 h-5" /> {book.reads_count ?? 0}</span>
            <span className="flex items-center gap-2"><Heart className="w-5 h-5" /> {book.likes_count ?? 0}</span>
          </div>
          <p className="text-lg text-white/80 max-w-3xl leading-relaxed mb-8">{book.description}</p>
          {chapters[0] && (
            <button
              data-tv-focusable
              onClick={() => navigate(`/tv/book/${book.id}/chapter/${chapters[0].chapter_number}`)}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-lg font-semibold outline-none transition-all focus:scale-[1.06] focus:shadow-[0_0_50px_rgba(217,70,239,0.6)]"
            >
              ▶ Empezar a leer
            </button>
          )}
        </div>
      </section>

      <section className="px-16 pb-24">
        <h3 className="text-2xl font-semibold mb-5">Capítulos</h3>
        <div className="grid grid-cols-2 gap-4">
          {chapters.map((c) => (
            <button
              key={c.id}
              data-tv-focusable
              onClick={() => navigate(`/tv/book/${book.id}/chapter/${c.chapter_number}`)}
              className="text-left p-6 rounded-2xl bg-white/5 border border-white/10 outline-none transition-all focus:bg-white/15 focus:border-violet-400 focus:scale-[1.03] focus:shadow-[0_0_30px_rgba(167,139,250,0.5)]"
            >
              <p className="text-sm text-violet-300 mb-1">Capítulo {c.chapter_number}</p>
              <p className="text-lg font-medium">{c.title}</p>
            </button>
          ))}
          {chapters.length === 0 && (
            <p className="text-white/50">Aún no hay capítulos publicados.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default TVBook;