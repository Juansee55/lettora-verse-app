import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Eye,
  TrendingUp,
  Clock,
  X,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PromotionWithStats {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  books: {
    title: string;
    cover_url: string | null;
  } | null;
  viewsCount: number;
}

interface PromotionStatsProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromotionStats = ({ isOpen, onClose }: PromotionStatsProps) => {
  const [promotions, setPromotions] = useState<PromotionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user's promotions
    const { data: promoData } = await supabase
      .from("book_promotions")
      .select(`
        id,
        title,
        description,
        starts_at,
        ends_at,
        books:book_id (
          title,
          cover_url
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (promoData) {
      // Fetch views for each promotion
      const promosWithViews = await Promise.all(
        promoData.map(async (promo) => {
          const { count } = await supabase
            .from("promotion_views")
            .select("*", { count: "exact", head: true })
            .eq("promotion_id", promo.id);

          return {
            ...promo,
            books: promo.books as { title: string; cover_url: string | null } | null,
            viewsCount: count || 0,
          };
        })
      );

      setPromotions(promosWithViews);
      setTotalViews(promosWithViews.reduce((acc, p) => acc + p.viewsCount, 0));
    }

    setLoading(false);
  };

  const getStatus = (startsAt: string, endsAt: string) => {
    const now = Date.now();
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();

    if (now < start) return { label: "Programada", color: "text-amber-500 bg-amber-500/10" };
    if (now > end) return { label: "Finalizada", color: "text-muted-foreground bg-muted" };
    return { label: "Activa", color: "text-green-500 bg-green-500/10" };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[80vh] bg-background rounded-2xl border border-border shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Estadísticas de Promociones</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : promotions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">Sin promociones</h3>
                  <p className="text-sm text-muted-foreground">
                    Crea tu primera promoción para ver estadísticas
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-card rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs">Total promociones</span>
                      </div>
                      <p className="text-2xl font-bold">{promotions.length}</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Total vistas</span>
                      </div>
                      <p className="text-2xl font-bold">{totalViews}</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-border col-span-2 md:col-span-1">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs">Promedio por promo</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {promotions.length > 0
                          ? Math.round(totalViews / promotions.length)
                          : 0}
                      </p>
                    </div>
                  </div>

                  {/* Promotions list */}
                  <h3 className="font-semibold mb-3">Tus promociones</h3>
                  <div className="space-y-3">
                    {promotions.map((promo, index) => {
                      const status = getStatus(promo.starts_at, promo.ends_at);
                      return (
                        <motion.div
                          key={promo.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-card rounded-xl p-4 border border-border"
                        >
                          <div className="flex gap-3">
                            <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={promo.books?.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=150&fit=crop"}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium truncate">{promo.title}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                                  {status.label}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-2">
                                {promo.books?.title}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  {promo.viewsCount} vistas
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDate(promo.ends_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PromotionStats;
