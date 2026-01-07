import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Clock, Heart, Grid3X3, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";

const tabs = [
  { key: "reading", label: "Leyendo", icon: BookOpen },
  { key: "completed", label: "Completados", icon: Clock },
  { key: "favorites", label: "Favoritos", icon: Heart },
];

interface ReadingProgressWithBook {
  id: string;
  progress_percent: number | null;
  status: string | null;
  books: {
    id: string;
    title: string;
    cover_url: string | null;
    profiles: {
      display_name: string | null;
      username: string | null;
    } | null;
  } | null;
}

interface LikedBook {
  id: string;
  likeable_id: string;
  books: {
    id: string;
    title: string;
    cover_url: string | null;
    profiles: {
      display_name: string | null;
      username: string | null;
    } | null;
  } | null;
}

const LibraryPage = () => {
  const [activeTab, setActiveTab] = useState("reading");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [readingProgress, setReadingProgress] = useState<ReadingProgressWithBook[]>([]);
  const [likedBooks, setLikedBooks] = useState<LikedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLibrary = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch reading progress
      const { data: progressData } = await supabase
        .from("reading_progress")
        .select(`
          id,
          progress_percent,
          status,
          books:book_id (
            id,
            title,
            cover_url,
            profiles:author_id (
              display_name,
              username
            )
          )
        `)
        .eq("user_id", user.id);

      if (progressData) {
        setReadingProgress(progressData as unknown as ReadingProgressWithBook[]);
      }

      // Fetch liked books
      const { data: likesData } = await supabase
        .from("likes")
        .select(`
          id,
          likeable_id
        `)
        .eq("user_id", user.id)
        .eq("likeable_type", "book");

      if (likesData && likesData.length > 0) {
        const bookIds = likesData.map(l => l.likeable_id);
        const { data: booksData } = await supabase
          .from("books")
          .select(`
            id,
            title,
            cover_url,
            profiles:author_id (
              display_name,
              username
            )
          `)
          .in("id", bookIds);

        if (booksData) {
          const likedWithBooks = likesData.map(like => ({
            ...like,
            books: booksData.find(b => b.id === like.likeable_id) || null
          }));
          setLikedBooks(likedWithBooks as unknown as LikedBook[]);
        }
      }

      setLoading(false);
    };

    fetchLibrary();
  }, [navigate]);

  const getFilteredBooks = () => {
    if (activeTab === "favorites") {
      return likedBooks.map(l => ({
        id: l.books?.id || l.likeable_id,
        title: l.books?.title || "Sin título",
        author: l.books?.profiles?.display_name || l.books?.profiles?.username || "Anónimo",
        cover: l.books?.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop",
        progress: 100,
      }));
    }

    return readingProgress
      .filter(rp => {
        if (activeTab === "reading") return (rp.progress_percent || 0) < 100;
        if (activeTab === "completed") return (rp.progress_percent || 0) >= 100;
        return true;
      })
      .map(rp => ({
        id: rp.books?.id || rp.id,
        title: rp.books?.title || "Sin título",
        author: rp.books?.profiles?.display_name || rp.books?.profiles?.username || "Anónimo",
        cover: rp.books?.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop",
        progress: rp.progress_percent || 0,
      }));
  };

  const filteredBooks = getFilteredBooks();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-display font-bold">Mi Biblioteca</h1>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tu biblioteca está vacía</h3>
            <p className="text-muted-foreground mb-4">
              Explora y añade libros a tu colección
            </p>
            <Button variant="hero" onClick={() => navigate("/explore")}>
              Explorar libros
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/book/${book.id}`)}
                className="cursor-pointer group"
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 shadow-card">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {book.progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
                <p className="text-xs text-muted-foreground">{book.author}</p>
                {book.progress < 100 && (
                  <p className="text-xs text-primary mt-1">{book.progress}% leído</p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/book/${book.id}`)}
                className="flex gap-4 p-3 bg-card rounded-xl cursor-pointer hover:shadow-soft transition-shadow"
              >
                <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium line-clamp-1">{book.title}</h3>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                  {book.progress < 100 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progreso</span>
                        <span>{book.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${book.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default LibraryPage;
