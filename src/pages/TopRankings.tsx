import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Trophy, Globe, MapPin, Flag, Calendar,
  Heart, BookOpen, Loader2, Crown, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";

type RankingScope = "weekly" | "regional" | "national" | "international";
type ContentType = "books" | "microstories";

interface RankedBook {
  id: string;
  title: string;
  cover_url: string | null;
  reads_count: number | null;
  likes_count: number | null;
  genre: string | null;
  created_at: string | null;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface RankedMicrostory {
  id: string;
  title: string | null;
  content: string;
  likes_count: number | null;
  created_at: string | null;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const scopeConfig: Record<RankingScope, { label: string; icon: typeof Globe; color: string }> = {
  weekly: { label: "Semanal", icon: Calendar, color: "bg-blue-500" },
  regional: { label: "Regional", icon: MapPin, color: "bg-emerald-500" },
  national: { label: "Nacional", icon: Flag, color: "bg-amber-500" },
  international: { label: "Internacional", icon: Globe, color: "bg-purple-500" },
};

const TopRankingsPage = () => {
  const navigate = useNavigate();
  const [scope, setScope] = useState<RankingScope>("weekly");
  const [contentType, setContentType] = useState<ContentType>("books");
  const [books, setBooks] = useState<RankedBook[]>([]);
  const [microstories, setMicrostories] = useState<RankedMicrostory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, [scope, contentType]);

  const fetchRankings = async () => {
    setLoading(true);

    if (contentType === "books") {
      let query = supabase
        .from("books")
        .select(`id, title, cover_url, reads_count, likes_count, genre, created_at,
          profiles:author_id (display_name, username, avatar_url)`)
        .in("status", ["published", "completed"])
        .order("likes_count", { ascending: false })
        .limit(50);

      // For weekly, filter by last 7 days
      if (scope === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("created_at", weekAgo.toISOString());
      }

      const { data } = await query;
      setBooks((data as unknown as RankedBook[]) || []);
    } else {
      let query = supabase
        .from("microstories")
        .select(`id, title, content, likes_count, created_at,
          profiles:author_id (display_name, username, avatar_url)`)
        .order("likes_count", { ascending: false })
        .limit(50);

      if (scope === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("created_at", weekAgo.toISOString());
      }

      const { data } = await query;
      setMicrostories((data as unknown as RankedMicrostory[]) || []);
    }

    setLoading(false);
  };

  const getMedalColor = (rank: number) => {
    if (rank === 0) return "from-amber-400 to-yellow-500";
    if (rank === 1) return "from-gray-300 to-gray-400";
    if (rank === 2) return "from-amber-600 to-orange-700";
    return "";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">Atrás</span>
          </button>
          <h1 className="text-[17px] font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            TOP Rankings
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Content Type Toggle */}
      <div className="px-4 pt-3">
        <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
          <button
            onClick={() => setContentType("books")}
            className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
              contentType === "books" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            📚 Libros
          </button>
          <button
            onClick={() => setContentType("microstories")}
            className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
              contentType === "microstories" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            ✍️ Poemas
          </button>
        </div>
      </div>

      {/* Scope Tabs */}
      <div className="px-4 pt-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 min-w-max">
          {(Object.keys(scopeConfig) as RankingScope[]).map((s) => {
            const cfg = scopeConfig[s];
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ${
                  scope === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <cfg.icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rankings List */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : contentType === "books" ? (
          books.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No hay libros en este ranking aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {books.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => navigate(`/book/${book.id}`)}
                  className="flex items-center gap-3 p-3 bg-card rounded-2xl cursor-pointer active:bg-muted/50 transition-colors"
                >
                  {/* Rank */}
                  <div className="w-9 flex-shrink-0 text-center">
                    {index < 3 ? (
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getMedalColor(index)} flex items-center justify-center`}>
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <span className="text-[16px] font-bold text-muted-foreground">#{index + 1}</span>
                    )}
                  </div>

                  {/* Cover */}
                  <img
                    src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop"}
                    alt={book.title}
                    className="w-12 h-16 rounded-lg object-cover flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        TOP #{index + 1}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-semibold truncate mt-0.5">{book.title}</h3>
                    <p className="text-[12px] text-muted-foreground truncate">
                      {book.profiles?.display_name || "Anónimo"}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" /> {book.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <BookOpen className="w-3 h-3" /> {book.reads_count || 0}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          )
        ) : (
          microstories.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No hay poemas en este ranking aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {microstories.map((ms, index) => (
                <motion.div
                  key={ms.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => navigate("/microstories")}
                  className="flex items-center gap-3 p-3 bg-card rounded-2xl cursor-pointer active:bg-muted/50 transition-colors"
                >
                  <div className="w-9 flex-shrink-0 text-center">
                    {index < 3 ? (
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getMedalColor(index)} flex items-center justify-center`}>
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <span className="text-[16px] font-bold text-muted-foreground">#{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        TOP #{index + 1}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-semibold truncate mt-0.5">{ms.title || "Sin título"}</h3>
                    <p className="text-[12px] text-muted-foreground line-clamp-1">{ms.content}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {ms.profiles?.display_name || "Anónimo"}
                      </span>
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Heart className="w-3 h-3" /> {ms.likes_count || 0}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>

      <IOSBottomNav />
    </div>
  );
};

export default TopRankingsPage;
