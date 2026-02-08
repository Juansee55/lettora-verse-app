import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Send, Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatDateSeparator from "@/components/chat/ChatDateSeparator";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface Participant {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const ChatConversationPage = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<Participant | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    checkUserAndFetch();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  const checkUserAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setCurrentUserId(user.id);
    await fetchConversationData(user.id);
    await updateLastRead(user.id);
  };

  const fetchConversationData = async (userId: string) => {
    setLoading(true);
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", userId);

    if (participants && participants.length > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .eq("id", participants[0].user_id)
        .maybeSingle();
      if (profile) setOtherUser(profile);
    }

    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Error al cargar mensajes");
    } else {
      setMessages(messagesData || []);
    }
    setLoading(false);
  };

  const updateLastRead = async (userId: string) => {
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = "auto";

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId!,
      sender_id: currentUserId,
      content,
    });

    if (error) {
      toast.error("Error al enviar mensaje");
      setNewMessage(content);
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    const currDate = new Date(messages[index].created_at).toDateString();
    return prevDate !== currDate;
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const avatarInitial = (otherUser?.display_name || otherUser?.username || "?")[0].toUpperCase();

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* iOS Navigation Bar */}
      <div className="ios-header">
        <div className="flex items-center gap-1 px-2 py-2 min-h-[44px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/chats")}
            className="rounded-full h-9 px-2 gap-0.5 text-primary font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[15px]">Chats</span>
          </Button>

          <div
            className="flex items-center gap-2.5 flex-1 justify-center cursor-pointer -ml-12"
            onClick={() => otherUser && navigate(`/user/${otherUser.id}`)}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-semibold overflow-hidden">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                avatarInitial
              )}
            </div>
            <div className="text-center">
              <h1 className="text-[15px] font-semibold leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {otherUser?.display_name || otherUser?.username || "Usuario"}
              </h1>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-hero flex items-center justify-center mb-4 opacity-80">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary-foreground">{avatarInitial}</span>
              )}
            </div>
            <p className="text-base font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {otherUser?.display_name || otherUser?.username}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Envía un mensaje para iniciar la conversación
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((message, index) => (
              <div key={message.id}>
                {shouldShowDateSeparator(index) && (
                  <ChatDateSeparator dateStr={message.created_at} />
                )}
                <ChatBubble
                  content={message.content}
                  time={formatTime(message.created_at)}
                  isOwn={message.sender_id === currentUserId}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* iOS-style input bar */}
      <div className="border-t border-border/50 bg-background/70 backdrop-blur-2xl px-3 py-2 pb-safe">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              placeholder="Mensaje"
              value={newMessage}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
              className="w-full resize-none rounded-[20px] bg-muted/50 border border-border/60 px-4 py-2 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-shadow max-h-[120px] leading-relaxed"
              style={{ minHeight: "36px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all mb-[1px]"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
            ) : (
              <Send className="w-4 h-4 text-primary-foreground ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversationPage;
