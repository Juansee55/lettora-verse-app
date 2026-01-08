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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/navigation/BottomNav";

interface Microstory {
  id: string;
  title: string | null;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<"recent" | "trending">("recent");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchMicrostories();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchMicrostories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("microstories")
      .select(`
        *,
        author:profiles!author_id (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching microstories:", error);
    } else {
      setMicrostories(data || []);
    }
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!newContent.trim()) {
      toast({
        title: "Contenido requerido",
        description: "Escribe algo antes de publicar.",
        variant: "destructive",
      });
      return;
    }

    if (newContent.length > MAX_CHARS) {
      toast({
        title: "Demasiado largo",
        description: `Los microrrelatos tienen un máximo de ${MAX_CHARS} caracteres.`,
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para publicar.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const { error } = await supabase.from("microstories").insert({
      author_id: user.id,
      title: newTitle.trim() || null,
      content: newContent.trim(),
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo publicar. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Publicado!",
        description: "Tu microrrelato ya está visible para todos.",
      });
      setNewTitle("");
      setNewContent("");
      setShowCompose(false);
      fetchMicrostories();
    }
  };

  const handleLike = async (microstoryId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para dar like.",
        variant: "destructive",
      });
      return;
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("likeable_type", "microstory")
      .eq("likeable_id", microstoryId)
      .maybeSingle();

    const currentStory = microstories.find(m => m.id === microstoryId);
    const currentCount = currentStory?.likes_count || 0;

    if (existingLike) {
      // Unlike
      await supabase.from("likes").delete().eq("id", existingLike.id);
      await supabase
        .from("microstories")
        .update({ likes_count: Math.max(0, currentCount - 1) })
        .eq("id", microstoryId);
    } else {
      // Like
      await supabase.from("likes").insert({
        user_id: user.id,
        likeable_type: "microstory",
        likeable_id: microstoryId,
      });
      await supabase
        .from("microstories")
        .update({ likes_count: currentCount + 1 })
        .eq("id", microstoryId);
    }
    
    fetchMicrostories();
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
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h1 className="font-display font-semibold text-lg">Microrrelatos</h1>
              </div>
            </div>
            <Button 
              variant="hero" 
              size="sm" 
              onClick={() => setShowCompose(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Crear
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex mt-3 gap-2">
            <button
              onClick={() => setActiveTab("recent")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === "recent"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Clock className="w-4 h-4" />
              Recientes
            </button>
            <button
              onClick={() => setActiveTab("trending")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === "trending"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Populares
            </button>
          </div>
        </div>
      </motion.header>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md"
          >
            <div className="container mx-auto px-4 py-4 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => setShowCompose(false)}>
                  <X className="w-5 h-5" />
                </Button>
                <h2 className="font-display font-semibold">Nuevo microrrelato</h2>
                <Button variant="hero" size="sm" onClick={handlePublish}>
                  Publicar
                </Button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Input
                  placeholder="Título (opcional)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-lg font-display border-0 bg-muted/50 focus-visible:ring-1"
                />
                <Textarea
                  placeholder="Escribe tu microrrelato aquí...

Un microrrelato es una historia muy corta que captura un momento, una emoción o una idea en pocas palabras."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value.slice(0, MAX_CHARS))}
                  className="min-h-[300px] text-lg leading-relaxed border-0 bg-muted/50 focus-visible:ring-1 resize-none"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className={`${newContent.length > MAX_CHARS * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
                    {newContent.length} / {MAX_CHARS}
                  </span>
                  <div className="h-1 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${newContent.length > MAX_CHARS * 0.9 ? "bg-destructive" : "bg-primary"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(newContent.length / MAX_CHARS) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="space-y-1">
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">Sin microrrelatos aún</h3>
            <p className="text-muted-foreground mb-4">¡Sé el primero en compartir una historia corta!</p>
            <Button variant="hero" onClick={() => setShowCompose(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear microrrelato
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {microstories.map((story, index) => (
              <motion.article
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-2xl p-4 shadow-soft"
              >
                {/* Author header */}
                <div 
                  className="flex items-center gap-3 mb-3 cursor-pointer"
                  onClick={() => navigate(`/user/${story.author.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold">
                    {story.author.avatar_url ? (
                      <img 
                        src={story.author.avatar_url} 
                        alt="" 
                        className="w-full h-full rounded-full object-cover" 
                      />
                    ) : (
                      story.author.display_name?.[0] || "?"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{story.author.display_name || "Usuario"}</p>
                    <p className="text-sm text-muted-foreground">
                      @{story.author.username || "user"} • {formatDate(story.created_at)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>

                {/* Content */}
                {story.title && (
                  <h3 className="font-display font-semibold mb-2">{story.title}</h3>
                )}
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{story.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                  <button 
                    onClick={() => handleLike(story.id)}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">{story.likes_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{story.comments_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors ml-auto">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default MicrostoriesPage;
