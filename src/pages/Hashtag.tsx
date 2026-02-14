import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, TrendingUp, Clock, BookOpen, Feather, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";
import RichContentRenderer from "@/components/hashtags/RichContentRenderer";
import { useNameColors } from "@/hooks/useNameColors";

interface TaggedContent {
  id: string;
  content_id: string;
  content_type: string;
  created_at: string;
  // Joined data
  title?: string | null;
  content?: string | null;
  author_id?: string;
  author_name?: string;
  author_username?: string;
  author_avatar?: string | null;
}

const HashtagPage = () => {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const [hashtagInfo, setHashtagInfo] = useState<{ name: string; usage_count: number } | null>(null);
  const [contents, setContents] = useState<TaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"recent" | "top">("recent");

  useEffect(() => {
    if (tag) fetchHashtagData();
  }, [tag, activeTab]);

  const fetchHashtagData = async () => {
    setLoading(true);

    // Get hashtag info
    const { data: htData } = await supabase
      .from("hashtags")
      .select("name, usage_count")
      .eq("name", tag?.toLowerCase())
      .maybeSingle();

    setHashtagInfo(htData);

    if (!htData) { setLoading(false); return; }

    // Get content tagged with this hashtag
    const { data: taggedData } = await supabase
      .from("content_hashtags")
      .select("id, content_id, content_type, created_at")
      .eq("hashtag_id", (await supabase.from("hashtags").select("id").eq("name", tag?.toLowerCase()).single()).data?.id || "")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!taggedData || taggedData.length === 0) {
      setContents([]);
      setLoading(false);
      return;
    }

    // Fetch microstories
    const microIds = taggedData.filter(t => t.content_type === "microstory").map(t => t.content_id);
    const postIds = taggedData.filter(t => t.content_type === "post").map(t => t.content_id);

    const results: TaggedContent[] = [];

    if (microIds.length > 0) {
      const { data: micros } = await supabase
        .from("microstories")
        .select("id, title, content, author_id, likes_count, profiles:author_id(display_name, username, avatar_url)")
        .in("id", microIds);

      micros?.forEach(m => {
        const tagged = taggedData.find(t => t.content_id === m.id);
        const profile = m.profiles as any;
        results.push({
          id: tagged!.id,
          content_id: m.id,
          content_type: "microstory",
          created_at: tagged!.created_at,
          title: m.title,
          content: m.content,
          author_id: m.author_id,
          author_name: profile?.display_name || "Usuario",
          author_username: profile?.username || "user",
          author_avatar: profile?.avatar_url,
        });
      });
    }

    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from("posts")
        .select("id, content, user_id, likes_count, profiles:user_id(display_name, username, avatar_url)")
        .in("id", postIds);

      posts?.forEach(p => {
        const tagged = taggedData.find(t => t.content_id === p.id);
        const profile = p.profiles as any;
        results.push({
          id: tagged!.id,
          content_id: p.id,
          content_type: "post",
          created_at: tagged!.created_at,
          content: p.content,
          author_id: p.user_id,
          author_name: profile?.display_name || "Usuario",
          author_username: profile?.username || "user",
          author_avatar: profile?.avatar_url,
        });
      });
    }

    setContents(results);
    setLoading(false);
  };

  const authorIds = contents.map(c => c.author_id).filter(Boolean) as string[];
  const nameColors = useNameColors(authorIds);

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Ahora";
    if (h < 24) return `${h}h`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d`;
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

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
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-[18px]">#{tag}</h1>
                {hashtagInfo && (
                  <p className="text-[12px] text-muted-foreground">{hashtagInfo.usage_count} publicaciones</p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mt-3 gap-2">
            {[
              { key: "recent" as const, icon: Clock, label: "Recientes" },
              { key: "top" as const, icon: TrendingUp, label: "Populares" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : !hashtagInfo ? (
          <div className="text-center py-16">
            <Hash className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-[17px] font-semibold mb-1">Hashtag no encontrado</h3>
            <p className="text-[13px] text-muted-foreground">Este hashtag no existe todavía</p>
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-16">
            <Hash className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-[17px] font-semibold mb-1">Sin contenido</h3>
            <p className="text-[13px] text-muted-foreground">Nadie ha publicado con #{tag} aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contents.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="ios-section p-4 cursor-pointer"
                onClick={() => {
                  if (item.content_type === "microstory") navigate("/microstories");
                  else navigate("/feed");
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                    {item.author_avatar ? (
                      <img src={item.author_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (item.author_name || "?")[0]
                    )}
                  </div>
                  <div>
                    <p className={`font-medium text-[14px] ${item.author_id ? nameColors[item.author_id] || "" : ""}`}>
                      {item.author_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      @{item.author_username} · {formatDate(item.created_at)} · {item.content_type === "microstory" ? (
                        <span className="inline-flex items-center gap-0.5"><Feather className="w-3 h-3" /> Microrrelato</span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5"><BookOpen className="w-3 h-3" /> Post</span>
                      )}
                    </p>
                  </div>
                </div>
                {item.title && <h3 className="font-semibold text-[15px] mb-1">{item.title}</h3>}
                {item.content && (
                  <RichContentRenderer
                    content={item.content.length > 200 ? item.content.slice(0, 200) + "..." : item.content}
                    className="text-[14px] text-foreground/90 leading-relaxed"
                  />
                )}
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default HashtagPage;
