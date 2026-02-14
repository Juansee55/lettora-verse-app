import { useState, useEffect } from "react";
import { Eye, Heart, BookOpen, TrendingUp, Users, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PremiumStatsCardProps {
  userId: string;
}

interface AdvancedStats {
  totalReads: number;
  totalLikes: number;
  totalComments: number;
  totalBooks: number;
  totalFollowers: number;
  totalChapters: number;
  avgReadsPerBook: number;
  avgLikesPerBook: number;
}

const PremiumStatsCard = ({ userId }: PremiumStatsCardProps) => {
  const [stats, setStats] = useState<AdvancedStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const [booksRes, followersRes, chaptersRes, commentsRes] = await Promise.all([
        supabase.from("books").select("reads_count, likes_count").eq("author_id", userId),
        supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("chapters").select("id", { count: "exact", head: true }).in(
          "book_id",
          (await supabase.from("books").select("id").eq("author_id", userId)).data?.map(b => b.id) || []
        ),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("commentable_type", "book").in(
          "commentable_id",
          (await supabase.from("books").select("id").eq("author_id", userId)).data?.map(b => b.id) || []
        ),
      ]);

      const books = booksRes.data || [];
      const totalReads = books.reduce((a, b) => a + (b.reads_count || 0), 0);
      const totalLikes = books.reduce((a, b) => a + (b.likes_count || 0), 0);

      setStats({
        totalReads,
        totalLikes,
        totalComments: commentsRes.count || 0,
        totalBooks: books.length,
        totalFollowers: followersRes.count || 0,
        totalChapters: chaptersRes.count || 0,
        avgReadsPerBook: books.length > 0 ? Math.round(totalReads / books.length) : 0,
        avgLikesPerBook: books.length > 0 ? Math.round(totalLikes / books.length) : 0,
      });
    };

    fetchStats();
  }, [userId]);

  if (!stats) return null;

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const statItems = [
    { icon: Eye, label: "Lecturas totales", value: formatNum(stats.totalReads), color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Heart, label: "Likes totales", value: formatNum(stats.totalLikes), color: "text-rose-500", bg: "bg-rose-500/10" },
    { icon: MessageCircle, label: "Comentarios", value: formatNum(stats.totalComments), color: "text-green-500", bg: "bg-green-500/10" },
    { icon: Users, label: "Seguidores", value: formatNum(stats.totalFollowers), color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: BookOpen, label: "Capítulos escritos", value: formatNum(stats.totalChapters), color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: TrendingUp, label: "Promedio lecturas/libro", value: formatNum(stats.avgReadsPerBook), color: "text-teal-500", bg: "bg-teal-500/10" },
  ];

  return (
    <div className="mt-4">
      <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
        📊 Estadísticas avanzadas
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {statItems.map((item) => (
          <div key={item.label} className="bg-card rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${item.bg} flex items-center justify-center`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-[16px] font-semibold">{item.value}</p>
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PremiumStatsCard;
