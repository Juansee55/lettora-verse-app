import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  BookOpen,
  Bell,
  TrendingUp,
  Clock,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";
import BookCard from "@/components/books/BookCard";

interface Book {
  id: string;
  title: string;
  cover_url: string | null;
  genre: string | null;
  reads_count: number | null;
  likes_count: number | null;
  profiles: {
    display_name: string | null;
    username: string | null;
  } | null;
}

const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      // Fetch recent books
      const { data: recentData } = await supabase
        .from("books")
        .select(`
          id,
          title,
          cover_url,
          genre,
          reads_count,
          likes_count,
          profiles:author_id (
            display_name,
            username
          )
        `)
        .in("status", ["published", "completed"])
        .order("created_at", { ascending: false })
        .limit(8);

      // Fetch trending (most reads)
      const { data: trendingData } = await supabase
        .from("books")
        .select(`
          id,
          title,
          cover_url,
          genre,
          reads_count,
          likes_count,
          profiles:author_id (
            display_name,
            username
          )
        `)
        .in("status", ["published", "completed"])
        .order("reads_count", { ascending: false })
        .limit(4);

      if (recentData) setBooks(recentData);
      if (trendingData) setTrendingBooks(trendingData);
      setLoading(false);
    };

    fetchBooks();
  }, []);

  const formatBookForCard = (book: Book) => ({
    id: book.id,
    title: book.title,
    author: book.profiles?.display_name || book.profiles?.username || "Anónimo",
    cover: book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop",
    reads: book.reads_count || 0,
    likes: book.likes_count || 0,
    category: book.genre || "General",
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-gradient">Lettora</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar libros, autores, géneros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl bg-muted/50"
            />
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Microstories Banner */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            onClick={() => navigate("/microstories")}
            className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-primary-foreground font-display font-semibold text-lg">
                  ✨ Microrrelatos
                </h3>
                <p className="text-primary-foreground/80 text-sm">
                  Historias cortas en 500 caracteres
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          </div>
        </motion.section>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Trending Section */}
            {trendingBooks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-display font-semibold">Tendencias</h2>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/explore")}>
                    Ver más
                  </Button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                  {trendingBooks.map((book, index) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex-shrink-0"
                    >
                      <BookCard book={formatBookForCard(book)} variant="featured" />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-display font-semibold">
                    {books.length > 0 ? "Recién publicados" : "Sin libros aún"}
                  </h2>
                </div>
                {books.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/explore")}>
                    Ver más
                  </Button>
                )}
              </div>

              {books.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {books.map((book, index) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <BookCard book={formatBookForCard(book)} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">¡Sé el primero en publicar!</h3>
                  <p className="text-muted-foreground mb-4">
                    Aún no hay libros publicados. Crea tu primera historia.
                  </p>
                  <Button variant="hero" onClick={() => navigate("/write")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Escribir historia
                  </Button>
                </div>
              )}
            </section>

            {/* Categories */}
            <section>
              <h2 className="text-xl font-display font-semibold mb-4">Categorías</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  "Romance",
                  "Fantasía",
                  "Misterio",
                  "Poesía",
                  "Drama",
                  "Aventura",
                  "Ciencia Ficción",
                  "Terror",
                ].map((category, index) => (
                  <motion.button
                    key={category}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/explore?category=${category}`)}
                    className="px-4 py-2 bg-secondary rounded-full text-sm font-medium text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {category}
                  </motion.button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* FAB for creating new book */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => navigate("/write")}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-hero rounded-2xl shadow-glow flex items-center justify-center z-50"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <BottomNav />
    </div>
  );
};

export default HomePage;
