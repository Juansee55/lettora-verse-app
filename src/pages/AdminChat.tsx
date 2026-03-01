import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Shield, Loader2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const ADMIN_CHAT_NAME = "💬 Chat General de Admins";

const AdminChatPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initAdminChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initAdminChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setCurrentUserId(user.id);

    // Check admin
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      toast({ title: "Acceso denegado", variant: "destructive" });
      navigate("/settings");
      return;
    }

    // Find or create admin chat conversation
    // Look for existing admin chat by name
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("name", ADMIN_CHAT_NAME)
      .eq("is_group", true)
      .limit(1)
      .maybeSingle();

    let chatId: string;

    if (existing) {
      chatId = existing.id;
      
      // Ensure current user is a participant
      const { data: participation } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", chatId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!participation) {
        await supabase.from("conversation_participants").insert({
          conversation_id: chatId,
          user_id: user.id,
          role: "admin",
        });
      }
    } else {
      // Create the admin chat
      chatId = crypto.randomUUID();
      await supabase.from("conversations").insert({
        id: chatId,
        name: ADMIN_CHAT_NAME,
        is_group: true,
        is_public: false,
        admin_only_messages: false,
      });

      await supabase.from("conversation_participants").insert({
        conversation_id: chatId,
        user_id: user.id,
        role: "owner",
      });

      // Add all other admins/mods
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "moderator"]);

      if (adminRoles) {
        const otherAdmins = adminRoles.filter(r => r.user_id !== user.id);
        if (otherAdmins.length > 0) {
          await supabase.from("conversation_participants").insert(
            otherAdmins.map(r => ({
              conversation_id: chatId,
              user_id: r.user_id,
              role: "admin",
            }))
          );
        }
      }
    }

    setConversationId(chatId);
    await fetchMessages(chatId);
    setLoading(false);

    // Subscribe to realtime
    const channel = supabase
      .channel(`admin-chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${chatId}` },
        async (payload) => {
          const msg = payload.new as Message;
          // Fetch sender profile if not cached
          if (!profiles[msg.sender_id]) {
            const { data: p } = await supabase
              .from("profiles")
              .select("display_name, username, avatar_url")
              .eq("id", msg.sender_id)
              .single();
            if (p) {
              setProfiles(prev => ({ ...prev, [msg.sender_id]: p }));
            }
          }
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("conversation_id", chatId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data);
      // Fetch all sender profiles
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", senderIds);
        if (profilesData) {
          const map: Record<string, any> = {};
          profilesData.forEach(p => { map[p.id] = p; });
          setProfiles(map);
        }
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !currentUserId) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
    });

    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Crown className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold truncate">Chat de Admins</h1>
            <p className="text-[12px] text-muted-foreground">Chat general del equipo</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-[15px] font-semibold mb-1">Chat de Administradores</h3>
            <p className="text-[13px] text-muted-foreground">Envía el primer mensaje al equipo</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;
          const sender = profiles[msg.sender_id];

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
            >
              {!isOwn && (
                <div
                  className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => navigate(`/user/${msg.sender_id}`)}
                >
                  {sender?.avatar_url ? (
                    <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    sender?.display_name?.[0]?.toUpperCase() || "?"
                  )}
                </div>
              )}
              <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn && (
                  <p className="text-[11px] text-amber-500 font-medium mb-0.5 px-1">
                    {sender?.display_name || sender?.username || "Admin"}
                  </p>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-[15px] leading-snug ${
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border/50 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isOwn ? "text-right" : ""}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-2xl border-t border-border/30 px-4 py-3 pb-safe">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Escribe un mensaje..."
            className="flex-1 h-10 px-4 rounded-full bg-muted/60 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminChatPage;
