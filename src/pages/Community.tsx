import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Loader2, BookOpen, Sparkles, Users, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { IOSHeader } from "@/components/ios/IOSHeader";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import CreateLiteraryPostModal from "@/components/community/CreateLiteraryPostModal";
import CommunityDiscover from "@/components/community/CommunityDiscover";
import FeedComments from "@/components/feed/FeedComments";

export interface LiteraryPost {
  id: string;
  user_id: string;
  post_type: string;
  content: string;
  quote_text: string | null;
  linked_book_id: string | null;
  likes_count: number;
  comments_count: number;
  think_count: number;
  touched_count: number;
  want_read_count: number;
  created_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  books: {
    id: string;
    title: string;
    cover_url: string | null;
    author_id: string;
  } | null;
}

type Tab = "feed" | "discover";

const CommunityPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<LiteraryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
    fetchPosts();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) fetchUserReactions(user.id);
  };

  const fetchUserReactions = async (userId: string) => {
    const { data } = await supabase
      .from("post_reactions")
      .select("post_id, reaction_type")
      .eq("user_id", userId);
    if (data) {
      const map: Record<string, string[]> = {};
      data.forEach((r: any) => {
        if (!map[r.post_id]) map[r.post_id] = [];
        map[r.post_id].push(r.reaction_type);
      });
      setUserReactions(map);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("literary_posts")
      .select(`
        *,
        profiles!literary_posts_user_id_fkey(id, display_name, username, avatar_url),
        books!literary_posts_linked_book_id_fkey(id, title, cover_url, author_id)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setPosts(data as unknown as LiteraryPost[]);
    } else {
      // Fallback: fetch without joins
      const { data: postsOnly } = await supabase
        .from("literary_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (postsOnly) {
        const userIds = [...new Set(postsOnly.map((p: any) => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", userIds);
        const profileMap: Record<string, any> = {};
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
        setPosts(postsOnly.map((p: any) => ({
          ...p,
          profiles: profileMap[p.user_id] || null,
          books: null,
        })) as LiteraryPost[]);
      }
    }
    setLoading(false);
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!currentUser) return;
    const current = userReactions[postId] || [];
    const hasReaction = current.includes(reactionType);

    // Optimistic update
    const countKey = reactionType === "like" ? "likes_count"
      : reactionType === "think" ? "think_count"
      : reactionType === "touched" ? "touched_count"
      : "want_read_count";

    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, [countKey]: hasReaction ? Math.max(0, (p as any)[countKey] - 1) : (p as any)[countKey] + 1 }
        : p
    ));

    setUserReactions(prev => {
      const updated = { ...prev };
      if (hasReaction) {
        updated[postId] = (updated[postId] || []).filter(r => r !== reactionType);
      } else {
        updated[postId] = [...(updated[postId] || []), reactionType];
      }
      return updated;
    });

    if (hasReaction) {
      await supabase.from("post_reactions").delete()
        .eq("user_id", currentUser.id)
        .eq("post_id", postId)
        .eq("reaction_type", reactionType);
    } else {
      await supabase.from("post_reactions").insert({
        user_id: currentUser.id,
        post_id: postId,
        reaction_type: reactionType,
      });
    }
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from("literary_posts").delete().eq("id", postId);
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({ title: "Publicación eliminada" });
    }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "feed", label: "Feed", icon: BookOpen },
    { key: "discover", label: "Descubrir", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <IOSHeader
        title="Comunidad"
        showBack={false}
        leftAction={
          <span className="text-[22px] font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Comunidad
          </span>
        }
        rightAction={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompose(true)}
            className="rounded-full h-9 w-9 p-0 bg-primary/10 text-primary"
          >
            <Plus className="w-4 h-4" />
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex px-4 pt-2 pb-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted/40 text-muted-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "feed" ? (
        <main className="px-0 py-2">
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
                className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-5"
              >
                <BookOpen className="w-9 h-9 text-primary/40" />
              </motion.div>
              <h3 className="text-xl font-bold mb-1.5">La comunidad te espera</h3>
              <p className="text-[14px] text-muted-foreground/60 mb-6">
                Comparte una cita, reflexión o recomienda un libro
              </p>
              <Button
                onClick={() => setShowCompose(true)}
                className="rounded-full h-11 px-7 font-semibold shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4 mr-2" /> Compartir algo
              </Button>
            </div>
          ) : (
            <div className="space-y-3 px-4">
              {posts.map((post, i) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  index={i}
                  currentUserId={currentUser?.id}
                  userReactions={userReactions[post.id] || []}
                  onReaction={handleReaction}
                  onDelete={handleDelete}
                  onOpenComments={() => setOpenCommentsPostId(post.id)}
                  onNavigateUser={(id) => navigate(`/user/${id}`)}
                  onNavigateBook={(id) => navigate(`/book/${id}`)}
                />
              ))}
            </div>
          )}
        </main>
      ) : (
        <CommunityDiscover />
      )}

      <CreateLiteraryPostModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onCreated={() => { setShowCompose(false); fetchPosts(); }}
      />

      <FeedComments
        isOpen={!!openCommentsPostId}
        onClose={() => setOpenCommentsPostId(null)}
        postId={openCommentsPostId || ""}
        commentableType="literary_post"
        onCommentsCountChange={(count) => {
          if (openCommentsPostId) {
            setPosts(prev => prev.map(p =>
              p.id === openCommentsPostId ? { ...p, comments_count: count } : p
            ));
          }
        }}
      />

      <IOSBottomNav />
    </div>
  );
};

export default CommunityPage;
