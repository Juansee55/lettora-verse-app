import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark, Music2,
  Play, Pause, Volume2, VolumeX, Plus, ArrowLeft,
  Loader2, MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNameColors } from "@/hooks/useNameColors";

interface ReelPost {
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

const ReelsPage = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState<ReelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});
  const [playingMap, setPlayingMap] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const userIds = reels.map(r => r.user_id);
  const nameColors = useNameColors(userIds);

  useEffect(() => {
    fetchReels();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      const { data } = await supabase.from("likes").select("likeable_id")
        .eq("user_id", user.id).eq("likeable_type", "post");
      if (data) setUserLikes(new Set(data.map(l => l.likeable_id)));
    }
  };

  const fetchReels = async () => {
    setLoading(true);
    // Fetch posts with video/image media
    const { data } = await supabase
      .from("posts")
      .select(`*, profiles!posts_user_id_fkey(id, display_name, username, avatar_url)`)
      .in("media_type", ["video", "image"])
      .not("media_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setReels(data as ReelPost[]);
    setLoading(false);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const isLiked = userLikes.has(postId);

    setReels(prev => prev.map(p =>
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

  const togglePlay = (reelId: string) => {
    const video = videoRefs.current[reelId];
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlayingMap(prev => ({ ...prev, [reelId]: true }));
    } else {
      video.pause();
      setPlayingMap(prev => ({ ...prev, [reelId]: false }));
    }
  };

  const toggleMute = (reelId: string) => {
    const video = videoRefs.current[reelId];
    if (!video) return;
    video.muted = !video.muted;
    setMutedMap(prev => ({ ...prev, [reelId]: video.muted }));
  };

  // Intersection Observer for auto-play
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      const reelId = entry.target.getAttribute("data-reel-id");
      if (!reelId) return;
      const video = videoRefs.current[reelId];
      if (!video) return;

      if (entry.isIntersecting) {
        video.play().catch(() => {});
        setPlayingMap(prev => ({ ...prev, [reelId]: true }));
      } else {
        video.pause();
        setPlayingMap(prev => ({ ...prev, [reelId]: false }));
      }
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.7 });
    const elements = document.querySelectorAll("[data-reel-id]");
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels, observerCallback]);

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <Play className="w-16 h-16 mb-4 opacity-40" />
        <h2 className="text-xl font-bold mb-2">No hay reels aún</h2>
        <p className="text-white/60 text-center mb-6">Publica un video o imagen desde el feed para verlo aquí</p>
        <button
          onClick={() => navigate("/feed")}
          className="px-6 py-3 bg-primary rounded-full font-semibold"
        >
          Ir al Feed
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-3 pb-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-[18px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Reels</h1>
        <button onClick={() => navigate("/feed")} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Reels Container - Vertical Snap Scroll */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
      >
        {reels.map((reel, index) => {
          const author = reel.profiles || { id: reel.user_id, display_name: "Usuario", username: "user", avatar_url: null };
          const isLiked = userLikes.has(reel.id);
          const isMuted = mutedMap[reel.id] ?? true;

          return (
            <div
              key={reel.id}
              data-reel-id={reel.id}
              className="h-screen w-full snap-start snap-always relative flex items-center justify-center"
            >
              {/* Media */}
              {reel.media_type === "video" ? (
                <video
                  ref={el => { videoRefs.current[reel.id] = el; }}
                  src={reel.media_url!}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop
                  muted={isMuted}
                  playsInline
                  onClick={() => togglePlay(reel.id)}
                />
              ) : (
                <img
                  src={reel.media_url!}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

              {/* Play/Pause indicator */}
              {reel.media_type === "video" && !playingMap[reel.id] && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </motion.div>
              )}

              {/* Right Actions */}
              <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-20">
                {/* Avatar */}
                <button
                  onClick={() => navigate(`/user/${author.id}`)}
                  className="relative mb-2"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                    {author.avatar_url ? (
                      <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold">
                        {(author.display_name || "?")[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-black">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </button>

                {/* Like */}
                <motion.button
                  whileTap={{ scale: 0.7 }}
                  onClick={() => handleLike(reel.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <Heart className={`w-7 h-7 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
                  <span className="text-white text-[11px] font-semibold">{formatCount(reel.likes_count)}</span>
                </motion.button>

                {/* Comments */}
                <button className="flex flex-col items-center gap-1">
                  <MessageCircle className="w-7 h-7 text-white" />
                  <span className="text-white text-[11px] font-semibold">{formatCount(reel.comments_count)}</span>
                </button>

                {/* Share */}
                <button className="flex flex-col items-center gap-1">
                  <Share2 className="w-6 h-6 text-white" />
                  <span className="text-white text-[11px]">Enviar</span>
                </button>

                {/* Save */}
                <button className="flex flex-col items-center gap-1">
                  <Bookmark className="w-6 h-6 text-white" />
                </button>

                {/* Mute (video only) */}
                {reel.media_type === "video" && (
                  <button onClick={() => toggleMute(reel.id)} className="mt-1">
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white/70" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white/70" />
                    )}
                  </button>
                )}
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-6 left-4 right-16 z-20">
                <button
                  onClick={() => navigate(`/user/${author.id}`)}
                  className="flex items-center gap-2 mb-2"
                >
                  <span className={`font-bold text-[15px] ${nameColors[reel.user_id] || "text-white"}`}>
                    {author.display_name || author.username || "Usuario"}
                  </span>
                  <span className="text-white/60 text-[13px]">@{author.username}</span>
                </button>
                {reel.content && (
                  <p className="text-white text-[14px] leading-snug line-clamp-2">{reel.content}</p>
                )}
                {/* Music bar effect */}
                <div className="flex items-center gap-2 mt-3">
                  <Music2 className="w-3.5 h-3.5 text-white/60" />
                  <div className="flex-1 overflow-hidden">
                    <motion.p
                      animate={{ x: [0, -200] }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="text-white/60 text-[12px] whitespace-nowrap"
                    >
                      Sonido original · {author.display_name || author.username} · Lettora
                    </motion.p>
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                <div className="h-full bg-white/80 rounded-full" style={{ width: `${((index + 1) / reels.length) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReelsPage;
