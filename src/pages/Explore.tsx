import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, TrendingUp, Star, BookOpen, Users, Sparkles, Heart,
  Loader2, Flame, Clock, Award, ChevronRight, Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";
import BookCard from "@/components/books/BookCard";
import { useLanguage } from "@/contexts/LanguageContext";
import FloatingHearts from "@/components/valentines/FloatingHearts";
import { useNameColors } from "@/hooks/useNameColors";

const categories = [
  { name: "Todos", icon: Sparkles, color: "from-violet-500 to-purple-600" },
  { name: "Romance", icon: Heart, color: "from-rose-400 to-pink-600" },
  { name: "Fantasía", icon: Star, color: "from-amber-400 to-orange-600" },
  { name: "Misterio", icon: Search, color: "from-emerald-400 to-teal-600" },
  { name: "Poesía", icon: BookOpen, color: "from-sky-400 to-blue-600" },
  { name: "Drama", icon: Users, color: "from-fuchsia-400 to-purple-600" },
  { name: "Ciencia Ficción", icon: Flame, color: "from-cyan-400 to-indigo-600" },
  { name: "Terror", icon: Flame, color: "from-red-500 to-rose-800" },
];

interface Book {
  id: string;
  title: string;
  cover_url: string | null;
  genre: string | null;
  reads_count: number | null;
  likes_count: number | null;
  created_at: string | null;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface Writer {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface TrendingTag {
  id: string;
  name: string;
  usage_count: number;
}

const ExplorePage = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "Todos");
  const [books, setBooks] = useState<Book[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      let query = supabase
        .from("books")
        .select(`
          id, title, cover_url, genre, reads_count, likes_count, created_at,
          profiles:author_id (display_name, username, avatar_url)
        `)
        .in("status", ["published", "completed"])
        .order("reads_count", { ascending: false });

      if (activeCategory !== "Todos") {
        query = query.eq("genre", activeCategory);
      }

      const [
        { data: booksData },
        { data: trending },
        { data: recent },
        { data: writersData },
        { data: tagsData },
      ] = await Promise.all([
        query.limit(20),
        supabase
          .from("books")
          .select(`id, title, cover_url, genre, reads_count, likes_count, created_at, profiles:author_id (display_name, username, avatar_url)`)
          .in("status", ["published", "completed"])
          .order("likes_count", { ascending: false })
          .limit(6),
        supabase
          .from("books")
          .select(`id, title, cover_url, genre, reads_count, likes_count, created_at, profiles:author_id (display_name, username, avatar_url)`)
          .in("status", ["published", "completed"])
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .limit(8),
        supabase
          .from("hashtags")
          .select("id, name, usage_count")
          .order("usage_count", { ascending: false })
          .limit(8),
      ]);

      if (booksData) setBooks(booksData);
      if (trending) setTrendingBooks(trending);
      if (recent) setRecentBooks(recent);
      if (writersData) setWriters(writersData);
      if (tagsData) setTrendingTags(tagsData);
      setLoading(false);
    };

    fetchData();
  }, [activeCategory]);

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.profiles?.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatBookForCard = (book: Book) => ({
    id: book.id,
    title: book.title,
    author: book.profiles?.display_name || book.profiles?.username || "Anónimo",
    cover: book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop",
    reads: book.reads_count || 0,
    likes: book.likes_count || 0,
    category: book.genre || "General",
  });

  const isSearching = searchQuery.trim().length > 0;
  const writerIds = writers.map(w => w.id);
  const nameColors = useNameColors(writerIds);

  return (
    <div className="min-h-screen bg-background pb-24">
      <FloatingHearts />
      {/* iOS Header */}
      <div className="ios-header">
        <div className="px-4 pt-3 pb-2">
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[28px] font-bold tracking-tight mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Explorar
          </motion.h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar libros, autores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 rounded-lg bg-muted/60 border-0 text-[15px] placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Categories Scroll */}
      <div className="px-4 py-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 min-w-max">
          {categories.map((cat, index) => (
            <motion.button
              key={cat.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.name}
            </motion.button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : isSearching ? (
        /* Search Results */
        <div className="px-4">
          <p className="text-[13px] text-muted-foreground mb-3">
            {filteredBooks.length} resultado{filteredBooks.length !== 1 ? "s" : ""}
          </p>
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredBooks.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <BookCard book={formatBookForCard(book)} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-[15px] font-semibold mb-1">Sin resultados</h3>
              <p className="text-[13px] text-muted-foreground">Intenta con otro término</p>
            </div>
          )}
        </div>
      ) : (
        /* Main Content */
        <div className="space-y-6">
          {/* Trending Hashtags */}
          {trendingTags.length > 0 && (
            <section className="px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <Hash className="w-4.5 h-4.5 text-primary" />
                  Tendencias
                </h2>
                <button onClick={() => navigate("/trending")} className="text-[13px] text-primary font-medium flex items-center gap-0.5">
                  Ver más <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {trendingTags.map((tag, index) => (
                  <motion.button
                    key={tag.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => navigate(`/hashtag/${tag.name}`)}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[13px] font-medium active:scale-95 transition-transform"
                  >
                    #{tag.name}
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          {/* Featured Writers */}
          {writers.length > 0 && (
            <section className="px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <Award className="w-4.5 h-4.5 text-primary" />
                  Escritores
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                {writers.map((writer, index) => (
                  <motion.div
                    key={writer.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/user/${writer.id}`)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-hero flex items-center justify-center text-base font-bold text-primary-foreground overflow-hidden ring-2 ring-primary/20">
                      {writer.avatar_url ? (
                        <img src={writer.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        writer.display_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <span className={`text-[11px] whitespace-nowrap max-w-[60px] truncate ${nameColors[writer.id] || "text-muted-foreground"}`}>
                      {writer.display_name || writer.username || "Usuario"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Trending */}
          {trendingBooks.length > 0 && (
            <section>
              <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-[17px] font-semibold flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <TrendingUp className="w-4.5 h-4.5 text-rose-500" />
                  Tendencia
                </h2>
                <button className="text-[13px] text-primary font-medium flex items-center gap-0.5">
                  Ver más <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
                {trendingBooks.map((book, index) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="flex-shrink-0 w-[130px] cursor-pointer group"
                  >
                    <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 shadow-card">
                      <img
                        src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop"}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <h3 className="text-[13px] font-medium line-clamp-1">{book.title}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {book.profiles?.display_name || "Anónimo"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" /> {book.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <BookOpen className="w-3 h-3" /> {book.reads_count || 0}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Recent */}
          {recentBooks.length > 0 && (
            <section>
              <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-[17px] font-semibold flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <Clock className="w-4.5 h-4.5 text-blue-500" />
                  Recientes
                </h2>
              </div>
              <div className="px-4 space-y-2">
                {recentBooks.slice(0, 4).map((book, index) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="flex items-center gap-3 p-2.5 bg-card rounded-xl cursor-pointer active:bg-muted/50 transition-colors"
                  >
                    <img
                      src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop"}
                      alt={book.title}
                      className="w-12 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-medium truncate">{book.title}</h3>
                      <p className="text-[12px] text-muted-foreground truncate">
                        {book.profiles?.display_name || "Anónimo"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3" /> {book.likes_count || 0}
                        </span>
                        {book.genre && (
                          <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px]">{book.genre}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* All Books in Category */}
          {activeCategory !== "Todos" && (
            <section className="px-4">
              <h2 className="text-[17px] font-semibold mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {activeCategory}
              </h2>
              {filteredBooks.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredBooks.map((book, index) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <BookCard book={formatBookForCard(book)} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">No hay libros en esta categoría</p>
                </div>
              )}
            </section>
          )}

          {activeCategory === "Todos" && filteredBooks.length > 0 && (
            <section className="px-4">
              <h2 className="text-[17px] font-semibold mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Todos los libros
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {filteredBooks.map((book, index) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <BookCard book={formatBookForCard(book)} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ExplorePage;
