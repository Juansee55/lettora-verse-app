import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Flame,
  Heart,
  Loader2,
  MessageCircle,
  PenLine,
  Search,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookCard from "@/components/books/BookCard";
import AnnouncementBanner from "@/components/announcements/AnnouncementBanner";
import PromotionsSection from "@/components/promotions/PromotionsSection";
import TopMicrostories from "@/components/microstories/TopMicrostories";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { Button } from "@/components/ui/button";

interface HomeBook {
  id: string;
  title: string;
  cover_url: string | null;
  genre: string | null;
  reads_count: number | null;
  likes_count: number | null;
  is_saga: boolean | null;
  author_id: string;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface HighlightedAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  followers: number;
  reads: number;
  likes: number;
}

const fallbackCover = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=420&fit=crop";

const formatNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const Home = () => {
  const navigate = useNavigate();
  const [trendingBooks, setTrendingBooks] = useState<HomeBook[]>([]);
  const [recentBooks, setRecentBooks] = useState<HomeBook[]>([]);
  const [highlightedAuthors, setHighlightedAuthors] = useState<HighlightedAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHome = async () => {
      setLoading(true);

      const [{ data: topBooks }, { data: newBooks }, { data: followers }] = await Promise.all([
        supabase
          .from("books")
          .select("id, title, cover_url, genre, reads_count, likes_count, is_saga, author_id, profiles:author_id(display_name, username, avatar_url)")
          .in("status", ["published", "completed"])
          .order("likes_count", { ascending: false })
          .limit(12),
        supabase
          .from("books")
          .select("id, title, cover_url, genre, reads_count, likes_count, is_saga, author_id, profiles:author_id(display_name, username, avatar_url)")
          .in("status", ["published", "completed"])
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("followers").select("following_id").limit(1000),
      ]);

      const top = ((topBooks || []) as unknown as HomeBook[]).filter(Boolean);
      const recent = ((newBooks || []) as unknown as HomeBook[]).filter(Boolean);
      const followerRows = ((followers || []) as { following_id: string }[]).filter(Boolean);
      const followerCounts = followerRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.following_id] = (acc[row.following_id] || 0) + 1;
        return acc;
      }, {});

      const authors = [...top, ...recent].reduce<Record<string, HighlightedAuthor>>((acc, book) => {
        if (!book.author_id) return acc;
        const profile = book.profiles;
        const reads = book.reads_count || 0;
        const likes = book.likes_count || 0;
        const followersCount = followerCounts[book.author_id] || 0;

        if (!acc[book.author_id]) {
          acc[book.author_id] = {
            id: book.author_id,
            displayName: profile?.display_name || profile?.username || "Autor",
            username: profile?.username || "autor",
            avatarUrl: profile?.avatar_url || null,
            score: 0,
            followers: followersCount,
            reads: 0,
            likes: 0,
          };
        }

        acc[book.author_id].reads += reads;
        acc[book.author_id].likes += likes;
        acc[book.author_id].score += reads + likes * 3 + followersCount * 8 + 20;
        return acc;
      }, {});

      setTrendingBooks(top);
      setRecentBooks(recent);
      setHighlightedAuthors(Object.values(authors).sort((a, b) => b.score - a.score).slice(0, 6));
      setLoading(false);
    };

    fetchHome();
  }, []);

  const heroBook = useMemo(() => trendingBooks[0] || recentBooks[0] || null, [trendingBooks, recentBooks]);

  const toCard = (book: HomeBook) => ({
    id: book.id,
    title: book.title,
    author: book.profiles?.display_name || book.profiles?.username || "Anónimo",
    cover: book.cover_url || fallbackCover,
    reads: book.reads_count || 0,
    likes: book.likes_count || 0,
    category: book.genre || "General",
    isSaga: Boolean(book.is_saga),
  });

  return (
    <div className="min-h-screen bg-background pb-28">
      <AnnouncementBanner />

      <header className="ios-header">
        <div className="flex items-center justify-between px-4 h-[58px]">
          <div>
            <p className="text-[12px] font-medium text-muted-foreground">Lettora</p>
            <h1 className="text-[28px] font-bold leading-none tracking-normal">Inicio</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/explore")} className="h-10 w-10 rounded-full bg-muted/70 flex items-center justify-center text-foreground">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/notifications")} className="h-10 w-10 rounded-full bg-muted/70 flex items-center justify-center text-foreground">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <main className="space-y-7 pt-3">
          <section className="px-4">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[28px] bg-card border border-border/60 p-4 min-h-[220px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/18 via-transparent to-accent/20" />
              <div className="relative flex gap-4 items-end">
                <div className="flex-1 min-w-0 py-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-[12px] font-semibold text-primary mb-3">
                    <Flame className="w-3.5 h-3.5" /> Destacado
                  </div>
                  <h2 className="text-[25px] font-bold leading-tight tracking-normal mb-2">
                    {heroBook ? heroBook.title : "Descubre tu próxima lectura"}
                  </h2>
                  <p className="text-[14px] text-muted-foreground line-clamp-2 mb-4">
                    {heroBook ? `Por ${heroBook.profiles?.display_name || heroBook.profiles?.username || "Anónimo"}` : "Libros gratuitos, microrrelatos y comunidad de escritores independientes."}
                  </p>
                  <Button onClick={() => navigate(heroBook ? `/book/${heroBook.id}` : "/explore")} className="rounded-full h-10 px-5">
                    Leer ahora <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                {heroBook && (
                  <img
                    src={heroBook.cover_url || fallbackCover}
                    alt={heroBook.title}
                    className="relative w-[104px] h-[148px] rounded-2xl object-cover shadow-xl ring-1 ring-border"
                    loading="eager"
                  />
                )}
              </div>
            </motion.div>
          </section>

          <section className="px-4 grid grid-cols-4 gap-2">
            {[
              { label: "Escribir", icon: PenLine, path: "/write" },
              { label: "Explorar", icon: BookOpen, path: "/explore" },
              { label: "Micros", icon: Sparkles, path: "/microstories" },
              { label: "Chat", icon: MessageCircle, path: "/chats" },
            ].map((item) => (
              <button key={item.path} onClick={() => navigate(item.path)} className="rounded-2xl bg-card border border-border/50 py-3 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform">
                <item.icon className="w-5 h-5 text-primary" />
                <span className="text-[11px] font-semibold">{item.label}</span>
              </button>
            ))}
          </section>

          <PromotionsSection />

          {highlightedAuthors.length > 0 && (
            <section className="px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[19px] font-bold flex items-center gap-2"><Flame className="w-5 h-5 text-primary" /> Autores destacados</h2>
                <button onClick={() => navigate("/top-rankings")} className="text-[13px] font-semibold text-primary flex items-center">Ranking <ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="overflow-x-auto -mx-4 px-4 pb-1">
                <div className="flex gap-3 min-w-max">
                  {highlightedAuthors.map((author, index) => (
                    <motion.button
                      key={author.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => navigate(`/user/${author.id}`)}
                      className="w-36 rounded-2xl bg-card border border-border/50 p-3 text-left"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-11 h-11 rounded-full bg-primary/12 overflow-hidden flex items-center justify-center text-primary font-bold">
                          {author.avatarUrl ? <img src={author.avatarUrl} alt={author.displayName} className="w-full h-full object-cover" /> : author.displayName[0]}
                        </div>
                        <Flame className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-[14px] font-bold line-clamp-1">{author.displayName}</p>
                      <p className="text-[12px] text-muted-foreground line-clamp-1">@{author.username}</p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {formatNumber(author.followers)}
                        <Heart className="w-3.5 h-3.5" /> {formatNumber(author.likes)}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {trendingBooks.length > 0 && (
            <section className="px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[19px] font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Más leídos</h2>
                <button onClick={() => navigate("/explore")} className="text-[13px] font-semibold text-primary flex items-center">Ver más <ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="overflow-x-auto -mx-4 px-4 pb-1">
                <div className="flex gap-4 min-w-max">
                  {trendingBooks.slice(0, 8).map((book) => (
                    <div key={book.id} className="w-[152px]">
                      <BookCard book={toCard(book)} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="px-4">
            <TopMicrostories limit={5} compact />
          </section>

          {recentBooks.length > 0 && (
            <section className="px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[19px] font-bold">Recién publicados</h2>
                <button onClick={() => navigate("/explore")} className="text-[13px] font-semibold text-primary flex items-center">Explorar <ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {recentBooks.slice(0, 4).map((book) => <BookCard key={book.id} book={toCard(book)} />)}
              </div>
            </section>
          )}
        </main>
      )}

      <IOSBottomNav />
    </div>
  );
};

export default Home;