import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Heart, MessageCircle, Share2,
  MoreHorizontal, Image, Film, Type, Loader2,
  Send, Bookmark, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/navigation/BottomNav";
import StoriesBar from "@/components/stories/StoriesBar";

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string;
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

const FeedPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPosts();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) fetchUserLikes(user.id);
  };

  const fetchUserLikes = async (userId: string) => {
    const { data } = await supabase.from("likes").select("likeable_id")
      .eq("user_id", userId).eq("likeable_type", "post");
    if (data) setUserLikes(new Set(data.map(l => l.likeable_id)));
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select(`*, author:profiles!user_id(id, display_name, username, avatar_url)`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPosts(data as any);
    setLoading(false);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!newContent.trim() && !mediaFile) return;
    setPublishing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    let mediaUrl = null;
    let mediaType = "text";

    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("posts").upload(path, mediaFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
        mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
      }
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: newContent.trim() || null,
      media_url: mediaUrl,
      media_type: mediaUrl ? mediaType : "text",
    });

    if (error) {
      toast({ title: "Error al publicar", variant: "destructive" });
    } else {
      toast({ title: "¡Publicado!" });
      setNewContent("");
      setMediaFile(null);
      setMediaPreview(null);
      setShowCompose(false);
      fetchPosts();
    }
    setPublishing(false);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const isLiked = userLikes.has(postId);

    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 } : p
    ));

    if (isLiked) {
      setUserLikes(prev => { const n = new Set(prev); n.delete(postId); return n; });
      await supabase.from("likes").delete().eq("user_id", currentUser.id).eq("likeable_type", "post").eq("likeable_id", postId);
    } else {
      setUserLikes(prev => new Set(prev).add(postId));
      await supabase.from("likes").insert({ user_id: currentUser.id, likeable_type: "post", likeable_id: postId });
    }
  };

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
      {/* Header */}
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-semibold text-[17px]">Publicaciones</h1>
          <Button variant="ios" size="ios-sm" onClick={() => setShowCompose(true)}>
            <Plus className="w-4 h-4 mr-1" /> Crear
          </Button>
        </div>
      </div>

      {/* Stories Bar */}
      <StoriesBar />

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
                <button onClick={() => setShowCompose(false)} className="text-primary text-[17px]">Cancelar</button>
                <h2 className="font-semibold text-[17px]">Nueva publicación</h2>
                <Button variant="ios" size="ios-sm" onClick={handlePublish} disabled={publishing || (!newContent.trim() && !mediaFile)}>
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}
                </Button>
              </div>
            </div>
            <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
              <Textarea
                placeholder="¿Qué quieres compartir?"
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="min-h-[150px] text-[17px] border-0 bg-muted/50 rounded-xl resize-none"
              />
              {mediaPreview && (
                <div className="relative rounded-2xl overflow-hidden">
                  {mediaFile?.type.startsWith("video") ? (
                    <video src={mediaPreview} controls className="w-full max-h-80 object-cover rounded-2xl" />
                  ) : (
                    <img src={mediaPreview} alt="" className="w-full max-h-80 object-cover rounded-2xl" />
                  )}
                  <button
                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 rounded-xl text-[15px] cursor-pointer hover:bg-muted transition-colors">
                  <Image className="w-5 h-5 text-primary" /> Foto
                  <input type="file" accept="image/*" className="hidden" onChange={handleMediaSelect} />
                </label>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 rounded-xl text-[15px] cursor-pointer hover:bg-muted transition-colors">
                  <Film className="w-5 h-5 text-primary" /> Video
                  <input type="file" accept="video/*" className="hidden" onChange={handleMediaSelect} />
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      <main className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Type className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-[17px] font-semibold mb-2">Sin publicaciones aún</h3>
            <p className="text-[15px] text-muted-foreground mb-5">¡Sé el primero en compartir!</p>
            <Button variant="ios" size="ios-lg" onClick={() => setShowCompose(true)}>
              <Plus className="w-4 h-4 mr-2" /> Crear publicación
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="ios-section overflow-hidden"
              >
                {/* Author */}
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div
                    className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/user/${post.author?.id}`)}
                  >
                    {post.author?.avatar_url ? (
                      <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (post.author?.display_name || "?")[0]
                    )}
                  </div>
                  <div className="flex-1" onClick={() => navigate(`/user/${post.author?.id}`)}>
                    <p className="font-medium text-[15px]">{post.author?.display_name || "Usuario"}</p>
                    <p className="text-[12px] text-muted-foreground">{formatDate(post.created_at)}</p>
                  </div>
                  <button className="p-2"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                </div>

                {/* Content */}
                {post.content && (
                  <p className="px-4 pb-2 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                )}

                {/* Media */}
                {post.media_url && (
                  post.media_type === "video" ? (
                    <video src={post.media_url} controls className="w-full max-h-[500px] object-cover" />
                  ) : (
                    <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" />
                  )
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 px-4 py-3 border-t border-border">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                      userLikes.has(post.id) ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Heart className={`w-[18px] h-[18px] ${userLikes.has(post.id) ? "fill-current" : ""}`} />
                    <span className="text-[13px] font-medium">{post.likes_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-muted-foreground hover:bg-muted">
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span className="text-[13px] font-medium">{post.comments_count}</span>
                  </button>
                  <div className="flex-1" />
                  <button className="p-2 rounded-full text-muted-foreground hover:bg-muted">
                    <Share2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-hero rounded-2xl shadow-glow flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <BottomNav />
    </div>
  );
};

export default FeedPage;
