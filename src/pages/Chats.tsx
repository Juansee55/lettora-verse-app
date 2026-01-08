import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, MessageCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/navigation/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar: string | null;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  other_user?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const ChatsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(user.id);
    fetchConversations(user.id);
  };

  const fetchConversations = async (userId: string) => {
    setLoading(true);

    // Get all conversations where user is a participant
    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (partError) {
      toast.error("Error al cargar conversaciones");
      setLoading(false);
      return;
    }

    if (!participations || participations.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // Get conversation details
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (convError) {
      toast.error("Error al cargar conversaciones");
      setLoading(false);
      return;
    }

    // Get other participants for each conversation
    const enrichedConversations: Conversation[] = await Promise.all(
      (convData || []).map(async (conv) => {
        // Get other participant
        const { data: otherParticipants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .neq("user_id", userId)
          .limit(1);

        let otherUser = null;
        if (otherParticipants && otherParticipants.length > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", otherParticipants[0].user_id)
            .maybeSingle();
          otherUser = profile;
        }

        // Get last message
        const { data: lastMessages } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        // Get unread count
        const { data: myParticipation } = await supabase
          .from("conversation_participants")
          .select("last_read_at")
          .eq("conversation_id", conv.id)
          .eq("user_id", userId)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", userId)
          .gt("created_at", myParticipation?.last_read_at || "1970-01-01");

        return {
          id: conv.id,
          name: conv.name,
          is_group: conv.is_group || false,
          avatar: conv.avatar,
          last_message: lastMessages?.[0]?.content,
          last_message_time: lastMessages?.[0]?.created_at,
          unread_count: unreadCount || 0,
          other_user: otherUser
        };
      })
    );

    setConversations(enrichedConversations);
    setLoading(false);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Ayer";
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.is_group 
      ? conv.name 
      : conv.other_user?.display_name || conv.other_user?.username;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getDisplayName = (conv: Conversation) => {
    if (conv.is_group) return conv.name || "Grupo";
    return conv.other_user?.display_name || conv.other_user?.username || "Usuario";
  };

  const getAvatar = (conv: Conversation) => {
    if (conv.is_group) return conv.avatar || "👥";
    if (conv.other_user?.avatar_url) return conv.other_user.avatar_url;
    return (getDisplayName(conv)).charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-display font-bold">Mensajes</h1>
            <Button variant="ghost" size="icon">
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl bg-muted/50"
            />
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay conversaciones</h3>
            <p className="text-muted-foreground">Inicia una conversación con otro usuario</p>
          </div>
        ) : (
          filteredConversations.map((conv, index) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className="flex items-center gap-3 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl px-2 -mx-2"
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-display font-bold overflow-hidden ${
                    conv.is_group
                      ? "bg-secondary text-2xl"
                      : "bg-gradient-to-br from-violet-400 to-violet-600 text-primary-foreground"
                  }`}
                >
                  {typeof getAvatar(conv) === "string" && getAvatar(conv).startsWith("http") ? (
                    <img src={getAvatar(conv)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getAvatar(conv)
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium truncate">{getDisplayName(conv)}</h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatTime(conv.last_message_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate pr-2">
                    {conv.last_message || "Sin mensajes"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* FAB for new message */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-hero rounded-2xl shadow-glow flex items-center justify-center z-50"
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <BottomNav />
    </div>
  );
};

export default ChatsPage;