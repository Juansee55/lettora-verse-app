import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Send, Music2, Eye, MoreHorizontal, Trash2, EyeOff, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { filterCss, fontFamilyOf, timeAgoLabel, type OverlayLayer } from "./glimpseData";

export interface GlimpseStory {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: string;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
  duration_ms: number;
  filter: string | null;
  overlays: unknown;
  music: unknown;
  likes_count: number;
  replies_count: number;
  views_count: number | null;
}

interface Props {
  stories: GlimpseStory[];
  authorName: string;
  authorAvatar: string | null;
  isOwner: boolean;
  currentUserId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const parseFilter = (raw: string | null) => {
  if (!raw) return "none";
  const [id, intensity] = raw.split(":");
  return filterCss(id, intensity ? Number(intensity) : 1);
};

const GlimpseViewer = ({ stories, authorName, authorAvatar, isOwner, currentUserId, onClose, onChanged }: Props) => {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [reply, setReply] = useState("");
  const [menu, setMenu] = useState(false);
  const [viewers, setViewers] = useState<{ id: string; display_name: string; username: string; avatar_url: string | null }[] | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>();

  const story = stories[index];
  const duration = story?.duration_ms || 5000;
  const music = story?.music as { url?: string; title?: string; artist?: string; start?: number } | null;
  const layers = (Array.isArray(story?.overlays) ? story?.overlays : []) as OverlayLayer[];

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= stories.length) { onClose(); return i; }
      return i + 1;
    });
  }, [stories.length, onClose]);

  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // register view + like state
  useEffect(() => {
    if (!story) return;
    setLikes(story.likes_count || 0);
    setProgress(0);
    (async () => {
      if (!currentUserId) return;
      await supabase.from("story_views").upsert(
        { story_id: story.id, user_id: currentUserId },
        { onConflict: "story_id,user_id" }
      );
      const { data } = await supabase
        .from("story_likes")
        .select("id")
        .eq("story_id", story.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      setLiked(!!data);
    })();
  }, [story?.id, currentUserId]);

  // progress timer
  useEffect(() => {
    if (!story) return;
    let start = performance.now();
    let elapsed = 0;
    const tick = (t: number) => {
      if (!paused) {
        elapsed += t - start;
        const p = Math.min(1, elapsed / duration);
        setProgress(p);
        if (p >= 1) { next(); return; }
      }
      start = t;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [story?.id, paused, duration, next]);

  // music
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (music?.url) {
      const a = new Audio(music.url);
      a.currentTime = music.start || 0;
      a.volume = 0.8;
      a.play().catch(() => {});
      audioRef.current = a;
    }
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, [story?.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (paused) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
  }, [paused]);

  const toggleLike = async () => {
    if (!currentUserId || !story) return;
    if (liked) {
      await supabase.from("story_likes").delete().eq("story_id", story.id).eq("user_id", currentUserId);
      setLiked(false); setLikes((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("story_likes").insert({ story_id: story.id, user_id: currentUserId });
      setLiked(true); setLikes((n) => n + 1);
    }
  };

  const sendReply = async () => {
    if (!currentUserId || !story || !reply.trim()) return;
    const { error } = await supabase.from("story_replies").insert({
      story_id: story.id, user_id: currentUserId, content: reply.trim(),
    });
    if (error) toast.error("No se pudo enviar la respuesta");
    else { toast.success("Respuesta enviada"); setReply(""); }
  };

  const deleteStory = async () => {
    if (!story) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Glimpse eliminado");
    onChanged?.();
    onClose();
  };

  const muteAuthor = async () => {
    if (!currentUserId || !story) return;
    await supabase.from("story_mutes").insert({ user_id: currentUserId, muted_user_id: story.user_id });
    toast.success("No verás más sus Glimpse");
    onChanged?.();
    onClose();
  };

  const loadViewers = async () => {
    if (!story) return;
    const { data } = await supabase.from("story_views").select("user_id").eq("story_id", story.id);
    const ids = (data || []).map((v) => v.user_id);
    if (!ids.length) { setViewers([]); return; }
    const { data: profiles } = await supabase
      .from("profiles").select("id, display_name, username, avatar_url").in("id", ids);
    setViewers((profiles as never) || []);
  };

  if (!story) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black flex items-center justify-center select-none"
    >
      <div className="relative w-full h-full max-w-[520px] mx-auto overflow-hidden">
        {/* Media */}
        <div className="absolute inset-0" style={{ background: story.background_color || "#000" }}>
          {story.media_url && story.media_type === "video" ? (
            <video src={story.media_url} autoPlay loop playsInline muted={!!music?.url}
              className="w-full h-full object-cover" style={{ filter: parseFilter(story.filter) }} />
          ) : story.media_url ? (
            <img src={story.media_url} alt="" className="w-full h-full object-cover"
              style={{ filter: parseFilter(story.filter) }} />
          ) : null}
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {layers.map((l) =>
            l.kind === "drawing" ? (
              <img key={l.id} src={l.dataUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
            ) : l.kind === "sticker" ? (
              <span key={l.id} className="absolute"
                style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, fontSize: l.size, opacity: l.opacity,
                  transform: `translate(-50%,-50%) rotate(${l.rotation}deg)` }}>{l.emoji}</span>
            ) : (
              <span key={l.id} className="absolute whitespace-pre-wrap"
                style={{
                  left: `${l.x * 100}%`, top: `${l.y * 100}%`, color: l.color, fontSize: l.size,
                  opacity: l.opacity, fontFamily: fontFamilyOf(l.font), textAlign: l.align,
                  fontWeight: l.bold ? 700 : 400, fontStyle: l.italic ? "italic" : "normal",
                  textDecoration: l.underline ? "underline" : "none",
                  textShadow: l.shadow ? "0 2px 12px rgba(0,0,0,.6)" : "none",
                  transform: `translate(-50%,-50%) rotate(${l.rotation}deg)`,
                }}>{l.text}</span>
            )
          )}
          {!story.media_url && story.text_content && (
            <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-white text-2xl font-semibold">
              {story.text_content}
            </div>
          )}
        </div>

        {/* Tap zones */}
        <button className="absolute left-0 top-0 w-1/3 h-full" onClick={prev} aria-label="Anterior" />
        <button className="absolute right-0 top-0 w-1/3 h-full" onClick={next} aria-label="Siguiente" />
        <button className="absolute left-1/3 top-0 w-1/3 h-full" onClick={() => setPaused((p) => !p)} aria-label="Pausar" />

        {/* Progress */}
        <div className="absolute top-3 left-3 right-3 flex gap-1">
          {stories.map((s, i) => (
            <div key={s.id} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full bg-white rounded-full"
                style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-3 right-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 flex items-center justify-center text-white text-sm font-semibold">
            {authorAvatar ? <img src={authorAvatar} alt="" className="w-full h-full object-cover" /> : authorName[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold leading-tight truncate">{authorName}</p>
            <p className="text-white/70 text-[11px]">{timeAgoLabel(story.created_at)}</p>
          </div>
          {music?.title && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md max-w-[40%]">
              <Music2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <span className="text-white text-[11px] truncate">{music.title}</span>
            </div>
          )}
          <button onClick={() => setPaused((p) => !p)} className="text-white/90 p-1">
            {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button onClick={() => setMenu(true)} className="text-white/90 p-1"><MoreHorizontal className="w-5 h-5" /></button>
          <button onClick={onClose} className="text-white/90 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black/70 to-transparent">
          {isOwner ? (
            <button onClick={loadViewers} className="flex items-center gap-2 text-white text-sm">
              <Eye className="w-5 h-5" /> {story.views_count || 0} vistas
              <Heart className="w-5 h-5 ml-3" /> {likes}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onFocus={() => setPaused(true)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder="Responder…"
                className="flex-1 h-11 px-4 rounded-full bg-white/10 border border-white/25 text-white placeholder:text-white/50 text-sm outline-none backdrop-blur-md"
              />
              <button onClick={sendReply} className="w-11 h-11 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white">
                <Send className="w-5 h-5" />
              </button>
              <button onClick={toggleLike} className="w-11 h-11 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
                <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
              </button>
            </div>
          )}
        </div>

        {/* Menu */}
        <AnimatePresence>
          {menu && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-end z-10" onClick={() => setMenu(false)}>
              <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-t-3xl bg-background p-4 space-y-2">
                {isOwner ? (
                  <button onClick={deleteStory} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/50 text-destructive">
                    <Trash2 className="w-5 h-5" /> Eliminar Glimpse
                  </button>
                ) : (
                  <button onClick={muteAuthor} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/50">
                    <EyeOff className="w-5 h-5" /> Silenciar a {authorName}
                  </button>
                )}
                <button onClick={() => setMenu(false)} className="w-full p-3 rounded-2xl bg-muted/30 font-medium">Cancelar</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewers */}
        <AnimatePresence>
          {viewers && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-end z-10" onClick={() => setViewers(null)}>
              <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-h-[60%] overflow-y-auto rounded-t-3xl bg-background p-4">
                <p className="font-semibold mb-3">Vistas ({viewers.length})</p>
                {viewers.length === 0 && <p className="text-sm text-muted-foreground">Aún nadie lo ha visto.</p>}
                {viewers.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-semibold">
                      {v.avatar_url ? <img src={v.avatar_url} alt="" className="w-full h-full object-cover" /> : (v.display_name || "U")[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{v.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{v.username}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GlimpseViewer;