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
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import BookCard from "@/components/books/BookCard";
import TopMicrostories from "@/components/microstories/TopMicrostories";
import PromotionsSection from "@/components/promotions/PromotionsSection";
import CreatePromotionModal from "@/components/promotions/CreatePromotionModal";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import PromotionStats from "@/components/promotions/PromotionStats";

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
  const [searchFocused, setSearchFocused] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [refreshPromotions, setRefreshPromotions] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPromoStats, setShowPromoStats] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);

      setUnreadCount(count || 0);
    };

    fetchUnreadNotifications();

    const channel = supabase
      .channel("home-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => {
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
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
      {/* iOS Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-hero rounded-xl flex items-center justify-center">
                <BookOpen className="w-[18px] h-[18px] text-primary-foreground" />
              </div>
              <h1 className="text-[22px] font-bold">Lettora</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ios-ghost" 
                size="icon" 
                onClick={() => setShowPromoStats(true)}
              >
                <BarChart3 className="w-[22px] h-[22px]" />
              </Button>
              <Button 
                variant="ios-ghost" 
                size="icon" 
                className="relative"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="w-[22px] h-[22px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* iOS Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full h-[36px] pl-9 pr-4 rounded-xl bg-muted/60 text-[17px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-5 space-y-6">
        {/* Microstories Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate("/microstories")}
          className="bg-gradient-hero rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-primary-foreground font-semibold text-[17px]">
                ✨ Microrrelatos
              </h3>
              <p className="text-primary-foreground/80 text-[15px]">
                Historias cortas en 500 caracteres
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-2.5">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </motion.div>

        {/* Promotions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <PromotionsSection key={refreshPromotions} />
        </motion.div>

        {/* Create Promotion */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => setShowPromoModal(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-[17px] flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Crear Promoción
              </h3>
              <p className="text-white/80 text-[15px]">
                Destaca tu libro y llega a más lectores
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-2.5">
              <Plus className="w-5 h-5 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Top Microstories */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TopMicrostories limit={5} />
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Trending */}
            {trendingBooks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-[20px] font-bold">Tendencias</h2>
                  </div>
                  <Button variant="ios-ghost" size="ios-sm" className="text-primary" onClick={() => navigate("/explore")}>
                    Ver más
                  </Button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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

            {/* Recent */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="text-[20px] font-bold">
                    {books.length > 0 ? "Recién publicados" : "Sin libros aún"}
                  </h2>
                </div>
                {books.length > 0 && (
                  <Button variant="ios-ghost" size="ios-sm" className="text-primary" onClick={() => navigate("/explore")}>
                    Ver más
                  </Button>
                )}
              </div>

              {books.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {books.map((book, index) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 10 }}
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
                  <h3 className="text-[17px] font-semibold mb-1">¡Sé el primero en publicar!</h3>
                  <p className="text-[15px] text-muted-foreground mb-4">
                    Aún no hay libros publicados. Crea tu primera historia.
                  </p>
                  <Button variant="ios" size="ios-lg" onClick={() => navigate("/write")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Escribir historia
                  </Button>
                </div>
              )}
            </section>

            {/* Categories */}
            <section>
              <h2 className="text-[20px] font-bold mb-3">Categorías</h2>
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => navigate(`/explore?category=${category}`)}
                    className="px-4 py-2 bg-muted/60 rounded-full text-[15px] font-medium active:scale-95 transition-all hover:bg-primary hover:text-primary-foreground"
                  >
                    {category}
                  </motion.button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => navigate("/write")}
        className="fixed bottom-[80px] right-4 w-14 h-14 bg-gradient-hero rounded-full shadow-glow flex items-center justify-center z-40 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <IOSBottomNav />

      <CreatePromotionModal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onCreated={() => setRefreshPromotions((r) => r + 1)}
      />

      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          setUnreadCount(0);
        }}
      />

      <PromotionStats
        isOpen={showPromoStats}
        onClose={() => setShowPromoStats(false)}
      />
    </div>
  );
};

export default HomePage;
