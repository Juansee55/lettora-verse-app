import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronLeft, ChevronRight, Type } from "lucide-react";

/**
 * Lector optimizado para Smart TV.
 * - Sin botones de flecha en pantalla: usa directamente el D-pad del mando.
 * - ◀ ▶ pasa de página · ▲ ▼ ajusta tamaño · Atrás vuelve.
 */
const TVReader = () => {
  const { bookId, chapterNumber } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<any>(null);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [fontSize, setFontSize] = useState(28);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const { data: list } = await supabase
        .from("chapters")
        .select("id, title, chapter_number, content")
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true });
      setAllChapters(list || []);
      const current = (list || []).find(
        (c: any) => String(c.chapter_number) === String(chapterNumber)
      );
      setChapter(current);
      setPage(0);
    })();
  }, [bookId, chapterNumber]);

  // Pagina el contenido en bloques que quepan en pantalla.
  useEffect(() => {
    if (!chapter?.content) { setPages([]); return; }
    const words = chapter.content.split(/\s+/);
    // ~ 280 palabras por página a 28px en pantalla TV
    const wordsPerPage = Math.max(120, Math.round(420 * (24 / fontSize)));
    const out: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerPage) {
      out.push(words.slice(i, i + wordsPerPage).join(" "));
    }
    setPages(out.length ? out : [chapter.content]);
    setPage(0);
  }, [chapter, fontSize]);

  const goChapter = (num: number) => navigate(`/tv/book/${bookId}/chapter/${num}`);

  const nextPage = () => {
    if (page < pages.length - 1) {
      setPage((p) => p + 1);
      scrollRef.current?.scrollTo({ top: 0 });
    } else {
      const idx = allChapters.findIndex((c) => String(c.chapter_number) === String(chapterNumber));
      const next = allChapters[idx + 1];
      if (next) goChapter(next.chapter_number);
    }
  };
  const prevPage = () => {
    if (page > 0) {
      setPage((p) => p - 1);
      scrollRef.current?.scrollTo({ top: 0 });
    } else {
      const idx = allChapters.findIndex((c) => String(c.chapter_number) === String(chapterNumber));
      const prev = allChapters[idx - 1];
      if (prev) goChapter(prev.chapter_number);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight": e.preventDefault(); nextPage(); break;
        case "ArrowLeft":  e.preventDefault(); prevPage(); break;
        case "ArrowUp":    e.preventDefault(); setFontSize((s) => Math.min(48, s + 2)); break;
        case "ArrowDown":  e.preventDefault(); setFontSize((s) => Math.max(18, s - 2)); break;
        case "Enter":
        case " ":          e.preventDefault(); nextPage(); break;
        case "Backspace":
        case "Escape":
        case "GoBack":     e.preventDefault(); navigate(-1); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length, page, allChapters, chapterNumber]);

  if (!chapter) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0a0118] text-white">
        Cargando capítulo…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#13072a] to-[#1a0830] text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-16 py-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-violet-300">Capítulo {chapter.chapter_number}</p>
            <h1 className="text-xl font-semibold">{chapter.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <Type className="w-5 h-5" />
          <span className="text-sm">{fontSize}px</span>
          <span className="mx-3">·</span>
          <span className="text-sm">Página {page + 1} / {Math.max(pages.length, 1)}</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 grid grid-cols-[80px_1fr_80px] items-center px-16">
        <div className="grid place-items-center text-white/30">
          <ChevronLeft className="w-10 h-10" />
        </div>
        <article
          ref={scrollRef}
          className="max-w-5xl mx-auto leading-[1.7] text-white/90 overflow-hidden whitespace-pre-wrap"
          style={{ fontSize: `${fontSize}px` }}
        >
          {pages[page]}
        </article>
        <div className="grid place-items-center text-white/30">
          <ChevronRight className="w-10 h-10" />
        </div>
      </div>

      {/* Hint bar */}
      <footer className="px-16 py-6 flex items-center justify-between text-sm text-white/40 border-t border-white/5">
        <span>◀ Anterior · ▶ Siguiente · ▲▼ Tamaño · Atrás para volver</span>
        <div className="flex-1 mx-8 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-500 transition-all"
            style={{ width: `${((page + 1) / Math.max(pages.length, 1)) * 100}%` }}
          />
        </div>
        <span>{chapter.title}</span>
      </footer>
    </div>
  );
};

export default TVReader;