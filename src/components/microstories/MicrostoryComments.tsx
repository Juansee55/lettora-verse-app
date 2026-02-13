import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNameColors } from "@/hooks/useNameColors";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface MicrostoryCommentsProps {
  isOpen: boolean;
  onClose: () => void;
  microstoryId: string;
  onCommentsCountChange?: (count: number) => void;
}

const MicrostoryComments = ({ 
  isOpen, 
  onClose, 
  microstoryId,
  onCommentsCountChange 
}: MicrostoryCommentsProps) => {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const nameColors = useNameColors(comments.map(c => c.user.id));

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, microstoryId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        user:profiles!user_id (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq("commentable_type", "microstory")
      .eq("commentable_id", microstoryId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      setComments(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para comentar.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    const content = newComment.trim();
    setNewComment("");

    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      commentable_type: "microstory",
      commentable_id: microstoryId,
      content,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo publicar el comentario.",
        variant: "destructive",
      });
      setNewComment(content);
    } else {
      const { data: story } = await supabase
        .from("microstories")
        .select("comments_count")
        .eq("id", microstoryId)
        .single();
      
      const newCount = (story?.comments_count || 0) + 1;
      await supabase
        .from("microstories")
        .update({ comments_count: newCount })
        .eq("id", microstoryId);
      
      onCommentsCountChange?.(newCount);
      fetchComments();
    }
    setSending(false);
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="font-display font-semibold">Comentarios</h2>
            <div className="w-10" />
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Sin comentarios aún</p>
                <p className="text-sm text-muted-foreground">¡Sé el primero en comentar!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0 overflow-hidden">
                      {comment.user.avatar_url ? (
                        <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (comment.user.display_name || comment.user.username || "?")[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm truncate ${nameColors[comment.user.id] || ""}`}>
                          {comment.user.display_name || comment.user.username || "Usuario"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 rounded-full h-11 bg-muted/50"
                disabled={sending}
              />
              <Button 
                type="submit" 
                variant="hero" 
                size="icon" 
                className="rounded-full h-11 w-11"
                disabled={!newComment.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MicrostoryComments;
