import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Heart, MessageCircle, Share2,
  MoreHorizontal, Image, Film, Loader2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/navigation/BottomNav";
import StoriesBar from "@/components/stories/StoriesBar";
import { useLanguage } from "@/contexts/LanguageContext";

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const FeedPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
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
    const { data, error } = await supabase
      .from("posts")
      .select(`*, profiles!posts_user_id_fkey(id, display_name, username, avatar_url)`)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Error fetching posts:", error);
      // Fallback: fetch posts without join and then fetch profiles separately
      const { data: postsOnly } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (postsOnly && postsOnly.length > 0) {
        const userIds = [...new Set(postsOnly.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", userIds);
        
        const profileMap: Record<string, any> = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });
        
        const enriched = postsOnly.map(p => ({
          ...p,
          profiles: profileMap[p.user_id] || null,
        }));
        setPosts(enriched as Post[]);
      }
    } else if (data) {
      setPosts(data as Post[]);
    }
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
      toast({ title: t("publishError"), variant: "destructive" });
    } else {
      toast({ title: t("published") });
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
    if (h < 1) return t("now");
    if (h < 24) return `${h}h`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d`;
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const getAuthor = (post: Post) => post.profiles || { id: post.user_id, display_name: "Usuario", username: "user", avatar_url: null };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-semibold text-[17px]">{t("publications")}</h1>
          <Button variant="ghost" size="sm" onClick={() => setShowCompose(true)}>
            <Plus className="w-4 h-4 mr-1" /> {t("create")}
          </Button>
        </div>
      </div>

      <StoriesBar />

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
                <button onClick={() => setShowCompose(false)} className="text-primary text-[17px]">{t("cancel")}</button>
                <h2 className="font-semibold text-[17px]">{t("newPost")}</h2>
                <Button variant="ghost" size="sm" onClick={handlePublish} disabled={publishing || (!newContent.trim() && !mediaFile)}>
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : t("publish")}
                </Button>
              </div>
            </div>
            <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
              <Textarea
                placeholder={t("whatToShare")}
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
                  <Image className="w-5 h-5 text-primary" /> {t("photo")}
                  <input type="file" accept="image/*" className="hidden" onChange={handleMediaSelect} />
                </label>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 rounded-xl text-[15px] cursor-pointer hover:bg-muted transition-colors">
                  <Film className="w-5 h-5 text-primary" /> {t("video")}
                  <input type="file" accept="video/*" className="hidden" onChange={handleMediaSelect} />
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-[17px] font-semibold mb-2">{t("noPostsYet")}</h3>
            <p className="text-[15px] text-muted-foreground mb-5">{t("beFirst")}</p>
            <Button onClick={() => setShowCompose(true)}>
              <Plus className="w-4 h-4 mr-2" /> {t("createPost")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => {
              const author = getAuthor(post);
              return (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-2xl overflow-hidden border border-border/50"
                >
                  <div className="flex items-center gap-3 p-4 pb-2">
                    <div
                      className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold cursor-pointer overflow-hidden"
                      onClick={() => navigate(`/user/${author.id}`)}
                    >
                      {author.avatar_url ? (
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (author.display_name || "?")[0]
                      )}
                    </div>
                    <div className="flex-1" onClick={() => navigate(`/user/${author.id}`)}>
                      <p className="font-medium text-[15px]">{author.display_name || "Usuario"}</p>
                      <p className="text-[12px] text-muted-foreground">{formatDate(post.created_at)}</p>
                    </div>
                    <button className="p-2"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                  </div>

                  {post.content && (
                    <p className="px-4 pb-2 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  )}

                  {post.media_url && (
                    post.media_type === "video" ? (
                      <video src={post.media_url} controls className="w-full max-h-[500px] object-cover" />
                    ) : (
                      <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" />
                    )
                  )}

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
              );
            })}
          </div>
        )}
      </main>

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
