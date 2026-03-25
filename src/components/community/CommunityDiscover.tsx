import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, TrendingUp, Users, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrendingBook {
  id: string;
  title: string;
  cover_url: string | null;
  reads_count: number;
  likes_count: number;
  author: { display_name: string | null; username: string | null } | null;
}

interface ActiveWriter {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  book_count: number;
}

const CommunityDiscover = () => {
  const navigate = useNavigate();
  const [trendingBooks, setTrendingBooks] = useState<TrendingBook[]>([]);
  const [activeWriters, setActiveWriters] = useState<ActiveWriter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscoverData();
  }, []);

  const fetchDiscoverData = async () => {
    setLoading(true);

    // Trending books by recent reads
    const { data: books } = await supabase
      .from("books")
      .select("id, title, cover_url, reads_count, likes_count, profiles:author_id(display_name, username)")
      .eq("status", "published")
      .order("reads_count", { ascending: false })
      .limit(10);

    if (books) {
      setTrendingBooks(books.map((b: any) => ({
        ...b,
        author: b.profiles,
      })));
    }

    // Active writers (most books)
    const { data: writers } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .limit(10);

    if (writers) {
      // Count books for each writer
      const writerIds = writers.map((w: any) => w.id);
      const { data: bookCounts } = await supabase
        .from("books")
        .select("author_id")
        .in("author_id", writerIds)
        .eq("status", "published");

      const countMap: Record<string, number> = {};
      (bookCounts || []).forEach((b: any) => {
        countMap[b.author_id] = (countMap[b.author_id] || 0) + 1;
      });

      setActiveWriters(
        writers
          .map((w: any) => ({ ...w, book_count: countMap[w.id] || 0 }))
          .filter((w: ActiveWriter) => w.book_count > 0)
          .sort((a: ActiveWriter, b: ActiveWriter) => b.book_count - a.book_count)
          .slice(0, 8)
      );
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Trending Books */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-[16px] font-bold">Libros en tendencia</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {trendingBooks.map((book, i) => (
            <motion.button
              key={book.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/book/${book.id}`)}
              className="flex-shrink-0 w-[120px] text-left"
            >
              <div className="relative">
                {book.cover_url ? (
                  <img src={book.cover_url} alt="" className="w-full h-[170px] rounded-xl object-cover shadow-md" />
                ) : (
                  <div className="w-full h-[170px] rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-md">
                    <BookOpen className="w-8 h-8 text-primary/30" />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white font-bold">
                  #{i + 1}
                </div>
              </div>
              <p className="text-[12px] font-semibold mt-2 line-clamp-2 leading-tight">{book.title}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                {book.author?.display_name || book.author?.username || "Autor"}
              </p>
            </motion.button>
          ))}
          {trendingBooks.length === 0 && (
            <p className="text-[13px] text-muted-foreground/50 py-8 text-center w-full">
              Aún no hay libros publicados
            </p>
          )}
        </div>
      </section>

      {/* Active Writers */}
      {activeWriters.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-[16px] font-bold">Escritores destacados</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {activeWriters.map((writer, i) => (
              <motion.button
                key={writer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/user/${writer.id}`)}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/20 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden flex-shrink-0">
                  {writer.avatar_url ? (
                    <img src={writer.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{(writer.display_name || "?")[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">
                    {writer.display_name || writer.username}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">
                    {writer.book_count} {writer.book_count === 1 ? "libro" : "libros"}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Reading Tip */}
      <section>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 text-center">
          <Star className="w-8 h-8 text-primary/60 mx-auto mb-2" />
          <h3 className="text-[15px] font-bold mb-1">Descubre tu próxima lectura</h3>
          <p className="text-[13px] text-muted-foreground/70 leading-relaxed">
            Explora publicaciones de la comunidad, sigue a escritores y encuentra libros que conecten contigo.
          </p>
        </div>
      </section>
    </div>
  );
};

export default CommunityDiscover;
