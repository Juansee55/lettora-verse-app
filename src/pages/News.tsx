import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bug,
  CalendarDays,
  ChevronRight,
  Loader2,
  MessageCircle,
  Newspaper,
  RefreshCw,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FeedComments from "@/components/feed/FeedComments";
import LettoraMark from "@/components/brand/LettoraMark";

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  news_type: string;
  created_by: string;
  created_at: string;
  admin_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const typeConfig: Record<string, { label: string; icon: typeof Wrench; color: string }> = {
  update: { label: "Actualización", icon: RefreshCw, color: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  patch: { label: "Parche", icon: Wrench, color: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  bug: { label: "Bug fix", icon: Bug, color: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
};

const formatDate = (dateString: string) => new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date(dateString));

const NewsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    setError(false);

    const { data, error: newsError } = await (supabase
      .from("news" as any)
      .select("id, title, description, image_url, news_type, created_by, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false }) as any);

    if (newsError) {
      console.error("Error cargando novedades:", newsError);
      setError(true);
      setLoading(false);
      return;
    }

    const rows = (data || []) as NewsItem[];
    if (rows.length === 0) {
      setNews([]);
      setLoading(false);
      return;
    }

    const adminIds = [...new Set(rows.map((item) => item.created_by).filter(Boolean))];
    const newsIds = rows.map((item) => item.id);
    const [{ data: profiles }, { data: comments }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", adminIds),
      (supabase.from("comments" as any)
        .select("commentable_id")
        .eq("commentable_type", "news")
        .in("commentable_id", newsIds) as any),
    ]);

    const profileMap: Record<string, NewsItem["admin_profile"]> = {};
    (profiles || []).forEach((profile) => { profileMap[profile.id] = profile; });
    const counts: Record<string, number> = {};
    ((comments || []) as { commentable_id: string }[]).forEach((comment) => {
      counts[comment.commentable_id] = (counts[comment.commentable_id] || 0) + 1;
    });

    setCommentCounts(counts);
    setNews(rows.map((item) => ({ ...item, admin_profile: profileMap[item.created_by] || null })));
    setLoading(false);
  };

  useEffect(() => {
    void fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-full px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </button>
          <div className="flex items-center gap-2">
            <LettoraMark size="sm" animated />
            <h1 className="font-display text-[17px] font-semibold">Novedades</h1>
          </div>
          <div className="w-[72px]" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-primary to-fuchsia-500 p-5 text-white shadow-[0_22px_50px_-28px_hsl(var(--primary)/0.8)]"
        >
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.12, 1], rotate: [0, 8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/15 blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-5">
            <div className="max-w-sm">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/90">
                <Sparkles className="h-3.5 w-3.5" /> El diario de Lettora
              </div>
              <h2 className="font-display text-3xl font-bold leading-tight">Lo nuevo también cuenta historias.</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/78">Actualizaciones, mejoras y noticias del equipo que construye tu comunidad literaria.</p>
            </div>
            <div className="hidden sm:block">
              <LettoraMark size="lg" animated />
            </div>
          </div>
        </motion.section>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
          </div>
        ) : error ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-border/50 bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <Newspaper className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold">No pudimos cargar las novedades</h2>
            <p className="mt-1 text-sm text-muted-foreground">Inténtalo de nuevo en unos segundos.</p>
            <button onClick={() => void fetchNews()} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]">Reintentar</button>
          </motion.div>
        ) : news.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-dashed border-border/70 bg-card/70 px-6 py-16 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-primary/10 text-primary">
              <Newspaper className="h-10 w-10" />
            </div>
            <h2 className="font-display text-xl font-bold">Todavía no hay novedades</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">Cuando el equipo publique una actualización, aparecerá aquí.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Actualizaciones</p>
                <p className="mt-1 text-sm text-muted-foreground">Las últimas noticias de Lettora</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{news.length} {news.length === 1 ? "entrada" : "entradas"}</span>
            </div>

            {news.map((item, index) => {
              const config = typeConfig[item.news_type] || typeConfig.update;
              const Icon = config.icon;
              const commentsCount = commentCounts[item.id] || 0;
              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="overflow-hidden rounded-[26px] border border-border/60 bg-card shadow-sm"
                >
                  {item.image_url && (
                    <div className="relative h-52 overflow-hidden sm:h-64">
                      <img src={item.image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                      <span className={`absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur-md ${config.color}`}>
                        <Icon className="h-3.5 w-3.5" /> {config.label}
                      </span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      {!item.image_url && <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${config.color}`}><Icon className="h-3.5 w-3.5" /> {config.label}</span>}
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(item.created_at)}</span>
                    </div>
                    <h2 className="mt-3 font-display text-[22px] font-bold leading-tight">{item.title}</h2>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{item.description}</p>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                          {item.admin_profile?.avatar_url ? <img src={item.admin_profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
                        </div>
                        <span className="truncate text-[13px] font-semibold text-muted-foreground">{item.admin_profile?.display_name || item.admin_profile?.username || "Equipo Lettora"}</span>
                      </div>
                      <button
                        onClick={() => setSelectedNewsId(item.id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-2 text-[13px] font-bold text-primary transition-colors hover:bg-primary/15 active:scale-[0.98]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {commentsCount > 0 ? commentsCount : "Comentar"}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </main>

      {selectedNewsId && (
        <FeedComments
          isOpen
          onClose={() => setSelectedNewsId(null)}
          postId={selectedNewsId}
          commentableType="news"
          onCommentsCountChange={(count) => setCommentCounts((previous) => ({ ...previous, [selectedNewsId]: count }))}
        />
      )}
    </div>
  );
};

export default NewsPage;
