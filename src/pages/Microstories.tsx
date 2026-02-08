import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Sparkles,
  Clock,
  TrendingUp,
  X,
  Users,
  Send,
  Trophy,
  Repeat2,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/navigation/BottomNav";
import ShareAsImage from "@/components/microstories/ShareAsImage";
import MicrostoryComments from "@/components/microstories/MicrostoryComments";
import ShareMicrostoryInChat from "@/components/microstories/ShareMicrostoryInChat";
import CollaboratorsModal from "@/components/microstories/CollaboratorsModal";
import TopMicrostories from "@/components/microstories/TopMicrostories";
import ReportContentModal from "@/components/reports/ReportContentModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Microstory {
  id: string;
  title: string | null;
  content: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  created_at: string;
  author_id: string;
  author: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

const MAX_CHARS = 500;

const MicrostoriesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [microstories, setMicrostories] = useState<Microstory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [activeTab, setActiveTab] = useState<"recent" | "trending" | "top">("recent");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [shareStory, setShareStory] = useState<Microstory | null>(null);
  const [commentsStory, setCommentsStory] = useState<Microstory | null>(null);
  const [chatShareStory, setChatShareStory] = useState<Microstory | null>(null);
  const [collaboratorsStory, setCollaboratorsStory] = useState<Microstory | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userReposts, setUserReposts] = useState<Set<string>>(new Set());
  const [reportStory, setReportStory] = useState<Microstory | null>(null);

  useEffect(() => {
    fetchMicrostories();
    checkUser();
  }, [activeTab]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      fetchUserLikes(user.id);
      fetchUserReposts(user.id);
    }
  };

  const fetchUserLikes = async (userId: string) => {
    const { data } = await supabase
      .from("likes")
      .select("likeable_id")
      .eq("user_id", userId)
      .eq("likeable_type", "microstory");
    if (data) setUserLikes(new Set(data.map(l => l.likeable_id)));
  };

  const fetchUserReposts = async (userId: string) => {
    const { data } = await supabase
      .from("microstory_reposts")
      .select("microstory_id")
      .eq("user_id", userId);
    if (data) setUserReposts(new Set(data.map((r) => r.microstory_id)));
  };

  const fetchMicrostories = async () => {
    setLoading(true);
    let query = supabase
      .from("microstories")
      .select(`
        *,
        author:profiles!author_id (
          id,
          display_name,
          username,
          avatar_url
        )
      `);

    if (activeTab === "trending") {
      query = query.order("likes_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query.limit(50);
    if (!error) {
      setMicrostories((data || []).map(d => ({ ...d, reposts_count: d.reposts_count || 0 })));
    }
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!newContent.trim()) {
      toast({ title: "Contenido requerido", description: "Escribe algo antes de publicar.", variant: "destructive" });
      return;
    }
    if (newContent.length > MAX_CHARS) {
      toast({ title: "Demasiado largo", description: `Máximo ${MAX_CHARS} caracteres.`, variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { error } = await supabase.from("microstories").insert({
      author_id: user.id,
      title: newTitle.trim() || null,
      content: newContent.trim(),
    });

    if (error) {
      toast({ title: "Error", description: "No se pudo publicar.", variant: "destructive" });
    } else {
      toast({ title: "¡Publicado!", description: "Tu microrrelato ya es visible." });
      setNewTitle("");
      setNewContent("");
      setShowCompose(false);
      fetchMicrostories();
    }
  };

  const handleLike = async (microstoryId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }

    const isLiked = userLikes.has(microstoryId);
    const currentStory = microstories.find(m => m.id === microstoryId);
    const currentCount = currentStory?.likes_count || 0;

    // Optimistic update
    setMicrostories(prev => prev.map(m =>
      m.id === microstoryId ? { ...m, likes_count: isLiked ? Math.max(0, m.likes_count - 1) : m.likes_count + 1 } : m
    ));
    if (isLiked) {
      setUserLikes(prev => { const next = new Set(prev); next.delete(microstoryId); return next; });
    } else {
      setUserLikes(prev => new Set(prev).add(microstoryId));
    }

    if (isLiked) {
      const { data: existingLike } = await supabase.from("likes").select("id")
        .eq("user_id", user.id).eq("likeable_type", "microstory").eq("likeable_id", microstoryId).maybeSingle();
      if (existingLike) {
        await supabase.from("likes").delete().eq("id", existingLike.id);
        await supabase.from("microstories").update({ likes_count: Math.max(0, currentCount - 1) }).eq("id", microstoryId);
      }
    } else {
      await supabase.from("likes").insert({ user_id: user.id, likeable_type: "microstory", likeable_id: microstoryId });
      await supabase.from("microstories").update({ likes_count: currentCount + 1 }).eq("id", microstoryId);
    }
  };

  const handleRepost = async (microstoryId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }

    const isReposted = userReposts.has(microstoryId);
    const currentStory = microstories.find(m => m.id === microstoryId);
    const currentCount = currentStory?.reposts_count || 0;

    // Optimistic update
    setMicrostories(prev => prev.map(m =>
      m.id === microstoryId ? { ...m, reposts_count: isReposted ? Math.max(0, m.reposts_count - 1) : m.reposts_count + 1 } : m
    ));
    if (isReposted) {
      setUserReposts(prev => { const next = new Set(prev); next.delete(microstoryId); return next; });
    } else {
      setUserReposts(prev => new Set(prev).add(microstoryId));
    }

    if (isReposted) {
      await supabase.from("microstory_reposts")
        .delete()
        .eq("user_id", user.id)
        .eq("microstory_id", microstoryId);
      await supabase.from("microstories").update({ reposts_count: Math.max(0, currentCount - 1) }).eq("id", microstoryId);
    } else {
      await supabase.from("microstory_reposts").insert({ user_id: user.id, microstory_id: microstoryId });
      await supabase.from("microstories").update({ reposts_count: currentCount + 1 }).eq("id", microstoryId);
      toast({ title: "¡Reposteado!", description: "Microrrelato compartido en tu perfil." });
    }
  };

  const handleCommentsCountChange = (storyId: string, count: number) => {
    setMicrostories(prev => prev.map(m => m.id === storyId ? { ...m, comments_count: count } : m));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Hace un momento";
    if (hours < 24) return `Hace ${hours}h`;
    if (hours < 48) return "Ayer";
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* iOS Header */}
      <div className="ios-header">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-primary active:opacity-60">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h1 className="font-display font-semibold text-[17px]">Microrrelatos</h1>
              </div>
            </div>
            <Button variant="ios" size="ios-sm" onClick={() => setShowCompose(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Crear
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex mt-3 gap-2 overflow-x-auto">
            {[
              { key: "recent" as const, icon: Clock, label: "Recientes" },
              { key: "trending" as const, icon: TrendingUp, label: "Populares" },
              { key: "top" as const, icon: Trophy, label: "Top 10" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-colors flex-shrink-0 ${
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

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background"
          >
            <div className="ios-header">
              <div className="flex items-center justify-between px-4 h-[52px]">
                <button onClick={() => setShowCompose(false)} className="text-primary text-[17px]">
                  Cancelar
                </button>
                <h2 className="font-semibold text-[17px]">Nuevo microrrelato</h2>
                <Button variant="ios" size="ios-sm" onClick={handlePublish}>
                  Publicar
                </Button>
              </div>
            </div>

            <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
              <Input
                placeholder="Título (opcional)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-[17px] font-display border-0 bg-muted/50 focus-visible:ring-1 rounded-xl h-12"
              />
              <Textarea
                placeholder="Escribe tu microrrelato aquí...

Un microrrelato captura un momento o una emoción en pocas palabras."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value.slice(0, MAX_CHARS))}
                className="min-h-[300px] text-[17px] leading-relaxed border-0 bg-muted/50 focus-visible:ring-1 resize-none rounded-xl"
              />
              <div className="flex items-center justify-between text-[13px]">
                <span className={newContent.length > MAX_CHARS * 0.9 ? "text-destructive" : "text-muted-foreground"}>
                  {newContent.length} / {MAX_CHARS}
                </span>
                <div className="h-1 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${newContent.length > MAX_CHARS * 0.9 ? "bg-destructive" : "bg-primary"}`}
                    animate={{ width: `${(newContent.length / MAX_CHARS) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="px-4 py-4">
        {activeTab === "top" ? (
          <TopMicrostories limit={10} showHeader={false} />
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ios-section p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="space-y-1 flex-1">
                    <div className="w-24 h-4 bg-muted rounded" />
                    <div className="w-16 h-3 bg-muted rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-muted rounded" />
                  <div className="w-3/4 h-4 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : microstories.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-[17px] font-semibold mb-2">Sin microrrelatos aún</h3>
            <p className="text-[15px] text-muted-foreground mb-5">¡Sé el primero en compartir!</p>
            <Button variant="ios" size="ios-lg" onClick={() => setShowCompose(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear microrrelato
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {microstories.map((story, index) => (
              <motion.article
                key={story.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="ios-section p-4"
              >
                {/* Author header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/user/${story.author.id}`)}
                  >
                    {story.author.avatar_url ? (
                      <img src={story.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      story.author.display_name?.[0] || "?"
                    )}
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/user/${story.author.id}`)}>
                    <p className="font-medium text-[15px]">{story.author.display_name || "Usuario"}</p>
                    <p className="text-[12px] text-muted-foreground">
                      @{story.author.username || "user"} • {formatDate(story.created_at)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-lg hover:bg-muted">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setChatShareStory(story)}>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar en chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShareStory(story)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartir imagen
                      </DropdownMenuItem>
                      {currentUser?.id === story.author_id && (
                        <DropdownMenuItem onClick={() => setCollaboratorsStory(story)}>
                          <Users className="w-4 h-4 mr-2" />
                          Colaboradores
                        </DropdownMenuItem>
                      )}
                      {currentUser?.id !== story.author_id && (
                        <DropdownMenuItem
                          onClick={() => setReportStory(story)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Reportar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Content */}
                {story.title && (
                  <h3 className="font-display font-semibold text-[15px] mb-1.5">{story.title}</h3>
                )}
                <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">{story.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border">
                  <button
                    onClick={() => handleLike(story.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                      userLikes.has(story.id) ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Heart className={`w-[18px] h-[18px] ${userLikes.has(story.id) ? "fill-current" : ""}`} />
                    <span className="text-[13px] font-medium">{story.likes_count}</span>
                  </button>
                  <button
                    onClick={() => setCommentsStory(story)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span className="text-[13px] font-medium">{story.comments_count}</span>
                  </button>
                  <button
                    onClick={() => handleRepost(story.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                      userReposts.has(story.id) ? "text-green-600 bg-green-500/10" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Repeat2 className="w-[18px] h-[18px]" />
                    <span className="text-[13px] font-medium">{story.reposts_count}</span>
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setChatShareStory(story)}
                    className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Send className="w-[18px] h-[18px]" />
                  </button>
                  <button
                    onClick={() => setShareStory(story)}
                    className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Share2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {shareStory && (
        <ShareAsImage isOpen={!!shareStory} onClose={() => setShareStory(null)} story={shareStory} />
      )}
      {commentsStory && (
        <MicrostoryComments
          isOpen={!!commentsStory}
          onClose={() => setCommentsStory(null)}
          microstoryId={commentsStory.id}
          onCommentsCountChange={(count) => handleCommentsCountChange(commentsStory.id, count)}
        />
      )}
      {chatShareStory && (
        <ShareMicrostoryInChat isOpen={!!chatShareStory} onClose={() => setChatShareStory(null)} story={chatShareStory} />
      )}
      {collaboratorsStory && (
        <CollaboratorsModal
          isOpen={!!collaboratorsStory}
          onClose={() => setCollaboratorsStory(null)}
          microstoryId={collaboratorsStory.id}
          authorId={collaboratorsStory.author_id}
        />
      )}

      {reportStory && (
        <ReportContentModal
          isOpen={!!reportStory}
          onClose={() => setReportStory(null)}
          contentType="microstory"
          contentId={reportStory.id}
          contentTitle={reportStory.title || reportStory.content.slice(0, 50)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default MicrostoriesPage;
