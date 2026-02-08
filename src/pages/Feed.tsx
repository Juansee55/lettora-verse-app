import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Heart, MessageCircle, Share2,
  MoreHorizontal, Image, Film, Loader2, X, Bookmark,
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

  useEffect(() => { fetchPosts(); checkUser(); }, []);

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
      const { data: postsOnly } = await supabase
        .from("posts").select("*").order("created_at", { ascending: false }).limit(50);
      
      if (postsOnly && postsOnly.length > 0) {
        const userIds = [...new Set(postsOnly.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles").select("id, display_name, username, avatar_url").in("id", userIds);
        
        const profileMap: Record<string, any> = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });
        setPosts(postsOnly.map(p => ({ ...p, profiles: profileMap[p.user_id] || null })) as Post[]);
      }
    } else if (data) setPosts(data as Post[]);
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
        mediaUrl = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
        mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
      }
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id, content: newContent.trim() || null,
      media_url: mediaUrl, media_type: mediaUrl ? mediaType : "text",
    });

    if (error) toast({ title: t("publishError"), variant: "destructive" });
    else {
      toast({ title: t("published") });
      setNewContent(""); setMediaFile(null); setMediaPreview(null); setShowCompose(false);
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
      {/* iOS Header */}
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="text-primary p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[18px] font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t("publications")}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompose(true)}
            className="rounded-full h-9 px-3 bg-primary/10 text-primary font-semibold text-[13px]"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> {t("create")}
          </Button>
        </div>
      </div>

      <StoriesBar />

      {/* Compose Sheet */}
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
                <button
                  onClick={() => setShowCompose(false)}
                  className="text-primary text-[16px] font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {t("cancel")}
                </button>
                <h2 className="font-bold text-[17px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t("newPost")}</h2>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={publishing || (!newContent.trim() && !mediaFile)}
                  className="rounded-full h-9 px-5 bg-primary text-primary-foreground font-semibold text-[14px] disabled:opacity-30"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : t("publish")}
                </Button>
              </div>
            </div>
            <div className="px-4 py-5 max-w-2xl mx-auto space-y-4">
              <Textarea
                placeholder={t("whatToShare")}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="min-h-[160px] text-[17px] border-0 bg-transparent rounded-xl resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                autoFocus
              />
              {mediaPreview && (
                <div className="relative rounded-2xl overflow-hidden shadow-md">
                  {mediaFile?.type.startsWith("video") ? (
                    <video src={mediaPreview} controls className="w-full max-h-80 object-cover rounded-2xl" />
                  ) : (
                    <img src={mediaPreview} alt="" className="w-full max-h-80 object-cover rounded-2xl" />
                  )}
                  <button
                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-border/30">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 rounded-xl text-[14px] cursor-pointer hover:bg-muted/60 transition-colors font-medium">
                  <Image className="w-4.5 h-4.5 text-primary" /> {t("photo")}
                  <input type="file" accept="image/*" className="hidden" onChange={handleMediaSelect} />
                </label>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 rounded-xl text-[14px] cursor-pointer hover:bg-muted/60 transition-colors font-medium">
                  <Film className="w-4.5 h-4.5 text-primary" /> {t("video")}
                  <input type="file" accept="video/*" className="hidden" onChange={handleMediaSelect} />
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts */}
      <main className="px-0 py-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary/50" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-muted/50 mx-auto flex items-center justify-center mb-5"
            >
              <MessageCircle className="w-9 h-9 text-muted-foreground/40" />
            </motion.div>
            <h3 className="text-xl font-bold mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t("noPostsYet")}</h3>
            <p className="text-[14px] text-muted-foreground/60 mb-6">{t("beFirst")}</p>
            <Button onClick={() => setShowCompose(true)} className="rounded-full h-11 px-7 font-semibold shadow-md shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> {t("createPost")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {posts.map((post, i) => {
              const author = getAuthor(post);
              const isLiked = userLikes.has(post.id);
              return (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="bg-background"
                >
                  {/* Author header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground font-bold cursor-pointer overflow-hidden shadow-sm"
                      onClick={() => navigate(`/user/${author.id}`)}
                    >
                      {author.avatar_url ? (
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">{(author.display_name || "?")[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/user/${author.id}`)}>
                      <p className="font-semibold text-[14px] leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {author.display_name || "Usuario"}
                      </p>
                      <p className="text-[12px] text-muted-foreground/60 leading-tight mt-0.5">
                        @{author.username || "user"} · {formatDate(post.created_at)}
                      </p>
                    </div>
                    <button className="p-2 -mr-1 rounded-full hover:bg-muted/40 transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground/60" />
                    </button>
                  </div>

                  {/* Media */}
                  {post.media_url && (
                    <div className="relative">
                      {post.media_type === "video" ? (
                        <video src={post.media_url} controls className="w-full max-h-[500px] object-cover" />
                      ) : (
                        <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center px-3 py-2">
                    <div className="flex items-center gap-3">
                      <motion.button
                        onClick={() => handleLike(post.id)}
                        whileTap={{ scale: 0.8 }}
                        className="p-2 rounded-full active:bg-destructive/10 transition-colors"
                      >
                        <Heart className={`w-[22px] h-[22px] transition-colors ${isLiked ? "fill-destructive text-destructive" : "text-foreground"}`} />
                      </motion.button>
                      <button className="p-2 rounded-full">
                        <MessageCircle className="w-[22px] h-[22px] text-foreground" />
                      </button>
                      <button className="p-2 rounded-full">
                        <Share2 className="w-[20px] h-[20px] text-foreground" />
                      </button>
                    </div>
                    <div className="flex-1" />
                    <button className="p-2 rounded-full">
                      <Bookmark className="w-[20px] h-[20px] text-foreground" />
                    </button>
                  </div>

                  {/* Likes count */}
                  {post.likes_count > 0 && (
                    <p className="px-4 text-[13px] font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {post.likes_count.toLocaleString()} {post.likes_count === 1 ? "me gusta" : "me gusta"}
                    </p>
                  )}

                  {/* Content */}
                  {post.content && (
                    <p className="px-4 pb-1 text-[14px] leading-[1.5]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="font-semibold mr-1.5">{author.display_name || author.username}</span>
                      <span className="text-foreground/90 whitespace-pre-wrap">{post.content}</span>
                    </p>
                  )}

                  {/* Comments */}
                  {post.comments_count > 0 && (
                    <button className="px-4 py-1.5 text-[13px] text-muted-foreground/60">
                      Ver {post.comments_count === 1 ? "el comentario" : `los ${post.comments_count} comentarios`}
                    </button>
                  )}

                  <div className="h-1" />
                </motion.article>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/25 flex items-center justify-center z-40 active:scale-90 transition-transform"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <BottomNav />
    </div>
  );
};

export default FeedPage;
