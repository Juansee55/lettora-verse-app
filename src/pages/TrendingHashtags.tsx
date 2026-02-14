import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, TrendingUp, Flame, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";

interface TrendingTag {
  id: string;
  name: string;
  usage_count: number;
}

const TrendingHashtagsPage = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      const { data } = await supabase
        .from("hashtags")
        .select("id, name, usage_count")
        .order("usage_count", { ascending: false })
        .limit(30);
      setTags(data || []);
      setLoading(false);
    };
    fetchTrending();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* iOS Header */}
      <div className="ios-header">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-primary active:opacity-60">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-[18px]">Tendencias</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-16">
            <Hash className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-[17px] font-semibold mb-1">Sin tendencias</h3>
            <p className="text-[13px] text-muted-foreground">Usa #hashtags en tus publicaciones para crear tendencias</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag, index) => (
              <motion.button
                key={tag.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/hashtag/${tag.name}`)}
                className="w-full flex items-center gap-3 p-3.5 ios-section active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {index < 3 ? (
                    <Flame className="w-5 h-5 text-primary" />
                  ) : (
                    <Hash className="w-5 h-5 text-primary/60" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[15px]">#{tag.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {tag.usage_count} publicacion{tag.usage_count !== 1 ? "es" : ""}
                  </p>
                </div>
                <span className="text-[13px] font-bold text-muted-foreground/50">
                  #{index + 1}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default TrendingHashtagsPage;
