import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Newspaper, Bug, Wrench, RefreshCw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

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
  };
}

const typeConfig: Record<string, { label: string; icon: typeof Wrench; color: string }> = {
  update: { label: "Actualización", icon: RefreshCw, color: "bg-blue-500/15 text-blue-500" },
  patch: { label: "Parche", icon: Wrench, color: "bg-amber-500/15 text-amber-500" },
  bug: { label: "Bug Fix", icon: Bug, color: "bg-red-500/15 text-red-500" },
};

const NewsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    const { data } = await supabase
      .from("news" as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }) as any;

    if (data && data.length > 0) {
      const adminIds = [...new Set(data.map((n: any) => n.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", adminIds as string[]);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });

      setNews(data.map((n: any) => ({
        ...n,
        admin_profile: profileMap[n.created_by] || null,
      })));
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">{t("back")}</span>
          </button>
          <h1 className="font-display font-semibold text-[17px]">{t("news")}</h1>
          <div className="w-16" />
        </div>
      </div>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : news.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Newspaper className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-center">{t("noNews")}</h2>
            <p className="text-muted-foreground text-center text-[15px]">{t("noNewsDesc")}</p>
          </motion.div>
        ) : (
          news.map((item, index) => {
            const config = typeConfig[item.news_type] || typeConfig.update;
            const Icon = config.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-2xl border border-border/50 overflow-hidden"
              >
                {item.image_url && (
                  <div className="w-full h-48 overflow-hidden">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                    <span className="text-[12px] text-muted-foreground">{formatDate(item.created_at)}</span>
                  </div>
                  <h3 className="text-[17px] font-bold mb-1">{item.title}</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">{item.description}</p>

                  {item.admin_profile && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {item.admin_profile.avatar_url ? (
                          <img src={item.admin_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <span className="text-[13px] text-muted-foreground">
                        {item.admin_profile.display_name || item.admin_profile.username || "Admin"}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </main>
    </div>
  );
};

export default NewsPage;
