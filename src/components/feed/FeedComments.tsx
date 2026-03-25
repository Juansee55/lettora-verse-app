import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNameColors } from "@/hooks/useNameColors";
import { useNavigate } from "react-router-dom";
import RichContentRenderer from "@/components/hashtags/RichContentRenderer";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count: number;
  user: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface FeedCommentsProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  commentableType?: string;
  onCommentsCountChange?: (count: number) => void;
}

const FeedComments = ({ isOpen, onClose, postId, commentableType = "post", onCommentsCountChange }: FeedCommentsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const nameColors = useNameColors(comments.map(c => c.user.id));

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select(`
        id, content, created_at, user_id, likes_count,
        user:profiles!user_id (id, display_name, username, avatar_url)
      `)
      .eq("commentable_type", commentableType)
      .eq("commentable_id", postId)
      .order("created_at", { ascending: true });

    if (data) {
      setComments(data as unknown as Comment[]);
      onCommentsCountChange?.(data.length);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Inicia sesión para comentar", variant: "destructive" });
      return;
    }

    setSending(true);
    const content = newComment.trim();
    setNewComment("");

    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      commentable_type: commentableType,
      commentable_id: postId,
      content,
    });

    if (error) {
      toast({ title: "Error al comentar", variant: "destructive" });
      setNewComment(content);
    } else {
      fetchComments();
    }
    setSending(false);
  };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[75vh] flex flex-col shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border/30">
              <h3 className="text-[16px] font-bold">Comentarios</h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-[15px] font-medium">Sin comentarios aún</p>
                  <p className="text-[13px] text-muted-foreground/60 mt-1">¡Sé el primero en comentar!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 overflow-hidden cursor-pointer"
                      onClick={() => { onClose(); navigate(`/user/${comment.user.id}`); }}
                    >
                      {comment.user.avatar_url ? (
                        <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (comment.user.display_name || "?")[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`font-semibold text-[13px] cursor-pointer ${nameColors[comment.user.id] || ""}`}
                          onClick={() => { onClose(); navigate(`/user/${comment.user.id}`); }}
                        >
                          {comment.user.display_name || comment.user.username || "Usuario"}
                        </span>
                        <span className="text-[11px] text-muted-foreground/50">{formatTime(comment.created_at)}</span>
                      </div>
                      <p className="text-[14px] leading-[1.45] mt-0.5">
                        <RichContentRenderer content={comment.content} className="text-foreground" />
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-border/30 px-4 py-3 flex items-center gap-2 bg-background">
              <Input
                ref={inputRef}
                placeholder="Añade un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 rounded-full h-10 bg-muted/40 border-0 text-[14px] focus-visible:ring-1"
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-full h-10 w-10 flex-shrink-0"
                disabled={!newComment.trim() || sending}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FeedComments;
