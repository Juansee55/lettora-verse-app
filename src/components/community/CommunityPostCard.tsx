import { motion } from "framer-motion";
import {
  Heart, MessageCircle, Lightbulb, Sparkles, BookMarked,
  Trash2, Quote, PenLine, Star, BookOpen,
} from "lucide-react";
import { useNameColors } from "@/hooks/useNameColors";
import RichContentRenderer from "@/components/hashtags/RichContentRenderer";
import type { LiteraryPost } from "@/pages/Community";

interface Props {
  post: LiteraryPost;
  index: number;
  currentUserId?: string;
  userReactions: string[];
  onReaction: (postId: string, type: string) => void;
  onDelete: (postId: string) => void;
  onOpenComments: () => void;
  onNavigateUser: (id: string) => void;
  onNavigateBook: (id: string) => void;
}

const postTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  quote: { label: "Cita", icon: Quote, color: "text-amber-500" },
  reflection: { label: "Reflexión", icon: PenLine, color: "text-blue-500" },
  recommendation: { label: "Recomendación", icon: Star, color: "text-emerald-500" },
  own_text: { label: "Texto propio", icon: BookOpen, color: "text-violet-500" },
};

const reactions = [
  { type: "like", icon: Heart, label: "Me gusta", activeClass: "fill-red-500 text-red-500" },
  { type: "think", icon: Lightbulb, label: "Me hizo pensar", activeClass: "fill-amber-500 text-amber-500" },
  { type: "touched", icon: Sparkles, label: "Me llegó", activeClass: "fill-violet-500 text-violet-500" },
  { type: "want_read", icon: BookMarked, label: "Quiero leerlo", activeClass: "fill-emerald-500 text-emerald-500" },
];

const CommunityPostCard = ({
  post, index, currentUserId, userReactions,
  onReaction, onDelete, onOpenComments, onNavigateUser, onNavigateBook,
}: Props) => {
  const nameColors = useNameColors([post.user_id]);
  const author = post.profiles || { id: post.user_id, display_name: "Usuario", username: "user", avatar_url: null };
  const typeConf = postTypeConfig[post.post_type] || postTypeConfig.reflection;
  const TypeIcon = typeConf.icon;

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d`;
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const totalReactions = post.likes_count + post.think_count + post.touched_count + post.want_read_count;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-card rounded-2xl border border-border/30 overflow-hidden shadow-sm"
    >
      {/* Author header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div
          className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground font-bold cursor-pointer overflow-hidden shadow-sm"
          onClick={() => onNavigateUser(author.id)}
        >
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm">{(author.display_name || "?")[0].toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-[14px] leading-tight cursor-pointer ${nameColors[post.user_id] || ""}`}
            onClick={() => onNavigateUser(author.id)}
          >
            {author.display_name || "Usuario"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`flex items-center gap-0.5 text-[11px] font-medium ${typeConf.color}`}>
              <TypeIcon className="w-3 h-3" />
              {typeConf.label}
            </span>
            <span className="text-[11px] text-muted-foreground/40">·</span>
            <span className="text-[11px] text-muted-foreground/50">{formatTime(post.created_at)}</span>
          </div>
        </div>
        {currentUserId === post.user_id && (
          <button onClick={() => onDelete(post.id)} className="p-2 rounded-full hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-4 h-4 text-muted-foreground/50" />
          </button>
        )}
      </div>

      {/* Quote block */}
      {post.quote_text && (
        <div className="mx-4 mb-2 px-4 py-3 bg-primary/5 rounded-xl border-l-3 border-primary/30">
          <p className="text-[14px] italic text-foreground/80 leading-relaxed">
            "{post.quote_text}"
          </p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-3">
        <div className="text-[14px] leading-[1.6] text-foreground/90">
          <RichContentRenderer content={post.content} className="whitespace-pre-wrap" />
        </div>
      </div>

      {/* Linked book */}
      {post.books && (
        <button
          onClick={() => onNavigateBook(post.books!.id)}
          className="mx-4 mb-3 flex items-center gap-3 p-2.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
        >
          {post.books.cover_url ? (
            <img src={post.books.cover_url} alt="" className="w-10 h-14 rounded-lg object-cover shadow-sm" />
          ) : (
            <div className="w-10 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary/40" />
            </div>
          )}
          <div className="text-left min-w-0">
            <p className="text-[13px] font-semibold truncate">{post.books.title}</p>
            <p className="text-[11px] text-muted-foreground/60">Ver libro en Lettora</p>
          </div>
        </button>
      )}

      {/* Reactions */}
      <div className="px-3 pb-2 flex items-center gap-0.5">
        {reactions.map(r => {
          const isActive = userReactions.includes(r.type);
          const countKey = r.type === "like" ? "likes_count"
            : r.type === "think" ? "think_count"
            : r.type === "touched" ? "touched_count"
            : "want_read_count";
          const count = (post as any)[countKey] || 0;

          return (
            <motion.button
              key={r.type}
              whileTap={{ scale: 0.85 }}
              onClick={() => onReaction(post.id, r.type)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[12px] transition-all ${
                isActive ? "bg-primary/10" : "hover:bg-muted/40"
              }`}
              title={r.label}
            >
              <r.icon className={`w-[16px] h-[16px] transition-all ${isActive ? r.activeClass : "text-muted-foreground/60"}`} />
              {count > 0 && (
                <span className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={onOpenComments}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[12px] hover:bg-muted/40 transition-colors"
        >
          <MessageCircle className="w-[16px] h-[16px] text-muted-foreground/60" />
          {post.comments_count > 0 && (
            <span className="text-muted-foreground/60 font-medium">{post.comments_count}</span>
          )}
        </button>
      </div>

      {/* Reaction summary */}
      {totalReactions > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[12px] text-muted-foreground/50">
            {totalReactions} {totalReactions === 1 ? "reacción" : "reacciones"}
          </p>
        </div>
      )}
    </motion.article>
  );
};

export default CommunityPostCard;
