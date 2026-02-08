import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, MessageCircle, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/navigation/BottomNav";
import NewConversationModal from "@/components/chat/NewConversationModal";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import ChatListItem from "@/components/chat/ChatListItem";
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
    if (!user) { navigate("/auth"); return; }
    setCurrentUserId(user.id);
    fetchConversations(user.id);
  };

  const fetchConversations = async (userId: string) => {
    setLoading(true);
    try {
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

      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, last_read_at")
        .in("conversation_id", conversationIds);

      const otherUserIds = [...new Set(
        (allParticipants || []).filter(p => p.user_id !== userId).map(p => p.user_id)
      )];

      let profilesMap: Record<string, any> = {};
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", otherUserIds);
        if (profiles) profiles.forEach(p => { profilesMap[p.id] = p; });
      }

      const { data: lastMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      const lastMessageMap: Record<string, { content: string; created_at: string }> = {};
      (lastMessages || []).forEach(msg => {
        if (!lastMessageMap[msg.conversation_id]) {
          lastMessageMap[msg.conversation_id] = { content: msg.content, created_at: msg.created_at };
        }
      });

      const myParticipations: Record<string, string | null> = {};
      (allParticipants || []).forEach(p => {
        if (p.user_id === userId) myParticipations[p.conversation_id] = p.last_read_at;
      });

      const unreadCounts: Record<string, number> = {};
      (lastMessages || []).forEach(msg => {
        if (msg.sender_id !== userId) {
          const lastRead = myParticipations[msg.conversation_id] || "1970-01-01";
          if (msg.created_at > lastRead) {
            unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
          }
        }
      });

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
    <div className="min-h-screen bg-background pb-20">
      {/* iOS Header */}
      <div className="ios-header">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[28px] font-bold tracking-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {t("messages")}
            </motion.h1>
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9"
                onClick={() => setShowCreateGroup(true)}
              >
                <Users className="w-[20px] h-[20px]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9"
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="w-[22px] h-[22px]" strokeWidth={2.5} />
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-2 mb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("searchConversations")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 rounded-lg bg-muted/60 border-0 text-[15px] placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {t("noConversations")}
            </h3>
            <p className="text-[13px] text-muted-foreground mb-5">{t("startConversation")}</p>
            <Button
              onClick={() => setShowNewConversation(true)}
              className="rounded-full h-10 px-6 bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {t("newConversation")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredConversations.map((conv, index) => (
              <ChatListItem
                key={conv.id}
                id={conv.id}
                name={getDisplayName(conv)}
                avatar={getAvatar(conv)}
                isGroup={conv.is_group}
                lastMessage={conv.last_message}
                lastMessageTime={conv.last_message_time}
                unreadCount={conv.unread_count}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => setShowNewConversation(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40 active:scale-90 transition-transform"
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <NewConversationModal isOpen={showNewConversation} onClose={() => setShowNewConversation(false)} />
      <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
      <BottomNav />
    </div>
  );
};

export default ChatsPage;
