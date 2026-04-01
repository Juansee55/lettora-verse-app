import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ParagraphCommentsProps {
  chapterId: string;
  paragraphIndex: number;
  onClose: () => void;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null; username: string | null };
}

const ParagraphComments = ({ chapterId, paragraphIndex, onClose }: ParagraphCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [chapterId, paragraphIndex]);

  const fetchComments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const { data } = await supabase
      .from("paragraph_comments")
      .select("*")
      .eq("chapter_id", chapterId)
      .eq("paragraph_index", paragraphIndex)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      setComments(data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) })));
    } else {
      setComments([]);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newComment.trim() || !currentUserId) return;
    setSending(true);
    await supabase.from("paragraph_comments").insert({
      chapter_id: chapterId,
      user_id: currentUserId,
      paragraph_index: paragraphIndex,
      content: newComment.trim(),
    } as any);
    setNewComment("");
    setSending(false);
    fetchComments();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("paragraph_comments").delete().eq("id", id);
    fetchComments();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-t-3xl max-h-[70vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-[17px] font-semibold">Comentarios</h3>
            <p className="text-[12px] text-muted-foreground">Párrafo {paragraphIndex + 1}</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[14px] text-muted-foreground">Sin comentarios en este párrafo</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[13px] font-bold text-primary flex-shrink-0 overflow-hidden">
                  {c.profile?.avatar_url ? (
                    <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (c.profile?.display_name?.[0] || "?").toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{c.profile?.display_name || "Usuario"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[14px] mt-0.5 leading-relaxed">{c.content}</p>
                </div>
                {c.user_id === currentUserId && (
                  <button onClick={() => handleDelete(c.id)} className="text-muted-foreground/50 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            maxLength={300}
            className="flex-1 h-10 px-3 rounded-xl bg-muted text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={sending || !newComment.trim()}
            className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ParagraphComments;
