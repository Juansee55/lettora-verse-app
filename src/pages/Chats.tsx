import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, MessageCircle, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/navigation/BottomNav";
import NewConversationModal from "@/components/chat/NewConversationModal";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

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
    try {
      // Get all conversation IDs for this user
      const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (partError) throw partError;
      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      // Fetch all participants for these conversations (excluding current user)
      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, last_read_at")
        .in("conversation_id", conversationIds);

      // Get unique other user IDs
      const otherUserIds = [...new Set(
        (allParticipants || [])
          .filter(p => p.user_id !== userId)
          .map(p => p.user_id)
      )];

      // Fetch profiles in batch
      let profilesMap: Record<string, any> = {};
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", otherUserIds);
        if (profiles) {
          profiles.forEach(p => { profilesMap[p.id] = p; });
        }
      }

      // Fetch last message for each conversation in batch
      // We'll get the latest messages and group by conversation
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      // Group: first message per conversation = last message
      const lastMessageMap: Record<string, { content: string; created_at: string }> = {};
      (lastMessages || []).forEach(msg => {
        if (!lastMessageMap[msg.conversation_id]) {
          lastMessageMap[msg.conversation_id] = { content: msg.content, created_at: msg.created_at };
        }
      });

      // Get my participation for unread counts
      const myParticipations: Record<string, string | null> = {};
      (allParticipants || []).forEach(p => {
        if (p.user_id === userId) {
          myParticipations[p.conversation_id] = p.last_read_at;
        }
      });

      // Count unread messages per conversation
      const unreadCounts: Record<string, number> = {};
      (lastMessages || []).forEach(msg => {
        if (msg.sender_id !== userId) {
          const lastRead = myParticipations[msg.conversation_id] || "1970-01-01";
          if (msg.created_at > lastRead) {
            unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
          }
        }
      });

      // Build enriched conversations
      const enriched: Conversation[] = (convData || []).map(conv => {
        const otherParticipant = (allParticipants || []).find(
          p => p.conversation_id === conv.id && p.user_id !== userId
        );
        const otherUser = otherParticipant ? profilesMap[otherParticipant.user_id] : null;

        return {
          id: conv.id,
          name: conv.name,
          is_group: conv.is_group || false,
          avatar: conv.avatar,
          last_message: lastMessageMap[conv.id]?.content,
          last_message_time: lastMessageMap[conv.id]?.created_at,
          unread_count: unreadCounts[conv.id] || 0,
          other_user: otherUser,
        };
      });

      setConversations(enriched);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      toast.error(t("loadError"));
    }
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

    if (diffMins < 1) return t("now");
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return t("yesterday");
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
    return getDisplayName(conv).charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-display font-bold">{t("messages")}</h1>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(true)}>
                <Users className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowNewConversation(true)}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("searchConversations")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl bg-muted/50"
            />
          </div>
        </div>
      </motion.header>

      <div className="px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("noConversations")}</h3>
            <p className="text-muted-foreground mb-4">{t("startConversation")}</p>
            <Button variant="default" onClick={() => setShowNewConversation(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("newConversation")}
            </Button>
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
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-display font-bold overflow-hidden ${
                  conv.is_group
                    ? "bg-secondary text-2xl"
                    : "bg-gradient-to-br from-violet-400 to-violet-600 text-primary-foreground"
                }`}>
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
                    {conv.last_message || t("noMessages")}
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

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => setShowNewConversation(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-hero rounded-2xl shadow-glow flex items-center justify-center z-50"
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <NewConversationModal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
      />
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
      <BottomNav />
    </div>
  );
};

export default ChatsPage;
