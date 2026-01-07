import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, TrendingUp, Star, BookOpen, Users, Sparkles, Heart, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";
import BookCard from "@/components/books/BookCard";

const categories = [
  { name: "Todos", icon: Sparkles },
  { name: "Romance", icon: Heart },
  { name: "Fantasía", icon: Star },
  { name: "Misterio", icon: Search },
  { name: "Poesía", icon: BookOpen },
  { name: "Drama", icon: Users },
];

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

interface Writer {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const ExplorePage = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "Todos");
  const [books, setBooks] = useState<Book[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch books
      let query = supabase
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
        .order("reads_count", { ascending: false });

      if (activeCategory !== "Todos") {
        query = query.eq("genre", activeCategory);
      }

      const { data: booksData } = await query.limit(20);
      if (booksData) setBooks(booksData);

      // Fetch top writers (profiles with most books)
      const { data: writersData } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .limit(5);

      if (writersData) setWriters(writersData);

      setLoading(false);
    };

    fetchData();
  }, [activeCategory]);

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.profiles?.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
          <h1 className="text-2xl font-display font-bold mb-4">Explorar</h1>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar libros, autores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-xl bg-muted/50"
              />
            </div>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Categories */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((cat, index) => (
            <motion.button
              key={cat.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.name}
            </motion.button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Top Writers */}
          {writers.length > 0 && (
            <section className="px-4 mb-6">
              <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Escritores
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {writers.map((writer, index) => (
                  <motion.div
                    key={writer.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(`/user/${writer.id}`)}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-xl font-display font-bold text-primary-foreground overflow-hidden">
                      {writer.avatar_url ? (
                        <img
                          src={writer.avatar_url}
                          alt={writer.display_name || ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        writer.display_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {writer.display_name || writer.username || "Usuario"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Results */}
          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold">
                {filteredBooks.length} {filteredBooks.length === 1 ? "resultado" : "resultados"}
              </h2>
            </div>

            {filteredBooks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredBooks.map((book, index) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
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
                <h3 className="text-lg font-semibold mb-2">No hay libros</h3>
                <p className="text-muted-foreground">
                  No se encontraron libros en esta categoría.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default ExplorePage;
