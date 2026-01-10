import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Search, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface ShareMicrostoryInChatProps {
  isOpen: boolean;
  onClose: () => void;
  story: {
    id: string;
    title: string | null;
    content: string;
    author: {
      display_name: string;
      username: string;
    };
  };
}

const ShareMicrostoryInChat = ({ isOpen, onClose, story }: ShareMicrostoryInChatProps) => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      onClose();
      return;
    }

    // Get all conversations for current user
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participations.map(p => p.conversation_id);
    
    // Get other participants
    const { data: otherParticipants } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        user_id,
        profiles:user_id (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .in("conversation_id", convIds)
      .neq("user_id", user.id);

    if (otherParticipants) {
      const convs: Conversation[] = otherParticipants.map(p => ({
        id: p.conversation_id,
        otherUser: p.profiles as any,
      }));
      setConversations(convs);
    }

    setLoading(false);
  };

  const handleShare = async (conversationId: string) => {
    setSending(conversationId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const messageContent = `📖 *Microrrelato compartido*\n\n"${story.title || story.content.slice(0, 50)}..."\n\nPor @${story.author.username}`;

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageContent,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo compartir el microrrelato.",
        variant: "destructive",
      });
    } else {
      // Update conversation
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      toast({
        title: "¡Compartido!",
        description: "El microrrelato se envió correctamente.",
      });
      onClose();
    }
    setSending(null);
  };

  const filteredConversations = conversations.filter(conv => {
    const name = conv.otherUser.display_name || conv.otherUser.username || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

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
            <h2 className="font-display font-semibold">Enviar en chat</h2>
            <div className="w-10" />
          </div>

          {/* Preview */}
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <p className="text-sm text-muted-foreground line-clamp-2">
              "{story.title || story.content.slice(0, 80)}..."
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Por @{story.author.username}
            </p>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-full bg-muted/50"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay conversaciones</p>
                <p className="text-sm text-muted-foreground">
                  Sigue a alguien para iniciar un chat
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                      {conv.otherUser.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (conv.otherUser.display_name || conv.otherUser.username || "?")[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {conv.otherUser.display_name || conv.otherUser.username || "Usuario"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{conv.otherUser.username}
                      </p>
                    </div>
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={() => handleShare(conv.id)}
                      disabled={sending === conv.id}
                    >
                      {sending === conv.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareMicrostoryInChat;
