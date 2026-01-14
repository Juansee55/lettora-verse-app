import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock, Eye, Heart, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  ends_at: string;
  books: {
    id: string;
    title: string;
    cover_url: string | null;
    reads_count: number | null;
    likes_count: number | null;
    profiles: {
      display_name: string | null;
      username: string | null;
    } | null;
  } | null;
}

const PromotionsSection = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    const { data } = await supabase
      .from("book_promotions")
      .select(`
        id,
        title,
        description,
        ends_at,
        books:book_id (
          id,
          title,
          cover_url,
          reads_count,
          likes_count,
          profiles:author_id (
            display_name,
            username
          )
        )
      `)
      .gt("ends_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setPromotions(data as unknown as Promotion[]);
    setLoading(false);
  };

  const getTimeRemaining = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return "Expira pronto";
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (promotions.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
          </motion.div>
          Promociones
        </h2>
        <motion.button
          whileHover={{ x: 5 }}
          className="text-sm text-primary flex items-center gap-1"
        >
          Ver todas <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="overflow-x-auto px-4 pb-4 -mx-4">
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          <AnimatePresence>
            {promotions.map((promo, index) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => navigate(`/book/${promo.books?.id}`)}
                className="relative w-72 bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl overflow-hidden cursor-pointer group border border-border/50 hover:border-primary/30 transition-all hover:shadow-glow"
              >
                {/* Glowing effect */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.15), transparent 70%)",
                  }}
                />

                {/* Timer badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                  className="absolute top-3 right-3 z-10"
                >
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/90 backdrop-blur-sm rounded-full text-xs font-medium text-white shadow-lg">
                    <Clock className="w-3 h-3" />
                    {getTimeRemaining(promo.ends_at)}
                  </div>
                </motion.div>

                <div className="flex p-4 gap-4">
                  {/* Book cover */}
                  <motion.div
                    whileHover={{ rotate: [-1, 1, 0] }}
                    transition={{ duration: 0.3 }}
                    className="relative w-24 h-36 flex-shrink-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-violet-500/30 rounded-xl blur-lg transform -rotate-3" />
                    <img
                      src={promo.books?.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop"}
                      alt={promo.books?.title || ""}
                      className="relative w-full h-full object-cover rounded-xl shadow-lg"
                    />
                  </motion.div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-1">
                    <motion.h3
                      className="font-display font-bold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors"
                    >
                      {promo.title}
                    </motion.h3>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {promo.books?.title}
                    </p>

                    {promo.description && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3">
                        {promo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate">
                        {promo.books?.profiles?.display_name || promo.books?.profiles?.username || "Anónimo"}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {formatNumber(promo.books?.reads_count || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {formatNumber(promo.books?.likes_count || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Animated border gradient */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: "200% 100%" }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default PromotionsSection;
