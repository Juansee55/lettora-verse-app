import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Clock, Heart, Bookmark, Loader2, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";

const tabs = [
  { key: "reading", label: "Leyendo", icon: BookOpen },
  { key: "completed", label: "Completados", icon: Clock },
  { key: "saved", label: "Guardados", icon: Bookmark },
  { key: "favorites", label: "Favoritos", icon: Heart },
];

interface BookItem {
  id: string;
  title: string;
  author: string;
  cover: string;
  progress: number;
  genre?: string;
}

const LibraryPage = () => {
  const [activeTab, setActiveTab] = useState("reading");
  const [readingBooks, setReadingBooks] = useState<BookItem[]>([]);
  const [completedBooks, setCompletedBooks] = useState<BookItem[]>([]);
  const [savedBooks, setSavedBooks] = useState<BookItem[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const [progressRes, likesRes, savedRes] = await Promise.all([
      supabase
        .from("reading_progress")
        .select(`id, progress_percent, status, books:book_id (id, title, cover_url, genre, profiles:author_id (display_name, username))`)
        .eq("user_id", user.id),
      supabase
        .from("likes")
        .select("id, likeable_id")
        .eq("user_id", user.id)
        .eq("likeable_type", "book"),
      supabase
        .from("saved_books")
        .select("id, book_id")
        .eq("user_id", user.id),
    ]);

    // Process reading progress
    const progressData = (progressRes.data || []) as any[];
    const reading: BookItem[] = [];
    const completed: BookItem[] = [];

    progressData.forEach(rp => {
      const item: BookItem = {
        id: rp.books?.id || rp.id,
        title: rp.books?.title || "Sin título",
        author: rp.books?.profiles?.display_name || rp.books?.profiles?.username || "Anónimo",
        cover: rp.books?.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop",
        progress: rp.progress_percent || 0,
        genre: rp.books?.genre || undefined,
      };
      if ((rp.progress_percent || 0) >= 100) {
        completed.push(item);
      } else {
        reading.push(item);
      }
    });

    setReadingBooks(reading);
    setCompletedBooks(completed);

    // Process saved books
    const savedIds = (savedRes.data || []).map((s: any) => s.book_id);
    if (savedIds.length > 0) {
      const { data: savedBooksData } = await supabase
        .from("books")
        .select("id, title, cover_url, genre, profiles:author_id (display_name, username)")
        .in("id", savedIds);

      if (savedBooksData) {
        setSavedBooks(savedBooksData.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.profiles?.display_name || b.profiles?.username || "Anónimo",
          cover: b.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop",
          progress: 100,
          genre: b.genre || undefined,
        })));
      }
    }

    // Process favorites
    const likeIds = (likesRes.data || []).map((l: any) => l.likeable_id);
    if (likeIds.length > 0) {
      const { data: likedBooksData } = await supabase
        .from("books")
        .select("id, title, cover_url, genre, profiles:author_id (display_name, username)")
        .in("id", likeIds);

      if (likedBooksData) {
        setFavoriteBooks(likedBooksData.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.profiles?.display_name || b.profiles?.username || "Anónimo",
          cover: b.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop",
          progress: 100,
          genre: b.genre || undefined,
        })));
      }
    }

    setLoading(false);
  };

  const getCurrentBooks = (): BookItem[] => {
    switch (activeTab) {
      case "reading": return readingBooks;
      case "completed": return completedBooks;
      case "saved": return savedBooks;
      case "favorites": return favoriteBooks;
      default: return [];
    }
  };

  const currentBooks = getCurrentBooks();

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "reading": return { title: "Nada en lectura", subtitle: "Empieza a leer un libro y aparecerá aquí" };
      case "completed": return { title: "Sin completados", subtitle: "Los libros terminados aparecerán aquí" };
      case "saved": return { title: "Sin guardados", subtitle: "Guarda libros para leerlos después" };
      case "favorites": return { title: "Sin favoritos", subtitle: "Dale ❤️ a libros que te gusten" };
      default: return { title: "", subtitle: "" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  const totalCount = readingBooks.length + completedBooks.length + savedBooks.length + favoriteBooks.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* iOS Header */}
      <div className="ios-header">
        <div className="px-4 pt-3 pb-2">
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[28px] font-bold tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Mi Biblioteca
          </motion.h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {totalCount} {totalCount === 1 ? "libro" : "libros"} en tu colección
          </p>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 min-w-max">
            {tabs.map((tab) => {
              const count = tab.key === "reading" ? readingBooks.length
                : tab.key === "completed" ? completedBooks.length
                : tab.key === "saved" ? savedBooks.length
                : favoriteBooks.length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key ? "bg-primary-foreground/20" : "bg-muted"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {currentBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-[16px] font-semibold mb-1">{getEmptyMessage().title}</h3>
            <p className="text-[13px] text-muted-foreground mb-5 max-w-[220px]">{getEmptyMessage().subtitle}</p>
            <Button
              onClick={() => navigate("/explore")}
              className="rounded-full h-10 px-6 bg-primary text-primary-foreground font-semibold"
            >
              Explorar libros
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {currentBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => navigate(`/book/${book.id}`)}
                className="flex items-center gap-3 p-2.5 bg-card rounded-xl cursor-pointer active:bg-muted/50 transition-colors"
              >
                <div className="relative w-14 h-[76px] rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                  {activeTab === "reading" && book.progress > 0 && book.progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/80">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${book.progress}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-medium truncate">{book.title}</h3>
                  <p className="text-[12px] text-muted-foreground truncate">{book.author}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {activeTab === "reading" && book.progress > 0 && (
                      <span className="text-[11px] text-primary font-medium">{book.progress}%</span>
                    )}
                    {book.genre && (
                      <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{book.genre}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default LibraryPage;
