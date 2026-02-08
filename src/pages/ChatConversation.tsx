import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Send, Loader2, MoreHorizontal, Image, X, Users, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatDateSeparator from "@/components/chat/ChatDateSeparator";
import GroupInfoSheet from "@/components/chat/GroupInfoSheet";
import MessageActionsSheet from "@/components/chat/MessageActionsSheet";
import ReportContentModal from "@/components/reports/ReportContentModal";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string;
}

interface Participant {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ConvInfo {
  is_group: boolean;
  name: string | null;
  description: string | null;
  pinned_message_id: string | null;
  slow_mode_seconds: number;
  admin_only_messages: boolean;
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
  const [convInfo, setConvInfo] = useState<ConvInfo | null>(null);
  const [participantsMap, setParticipantsMap] = useState<Record<string, Participant>>({});
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("member");
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [lastSentTime, setLastSentTime] = useState<number>(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { checkUserAndFetch(); }, [conversationId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => setMessages(prev => [...prev, payload.new as Message]))
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id)))
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

    const { data: conv } = await supabase
      .from("conversations")
      .select("is_group, name, description, pinned_message_id, slow_mode_seconds, admin_only_messages")
      .eq("id", conversationId)
      .single();

    if (conv) setConvInfo(conv as ConvInfo);

    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id, role")
      .eq("conversation_id", conversationId);

    if (participants && participants.length > 0) {
      const myPart = participants.find(p => p.user_id === userId);
      if (myPart) setCurrentRole(myPart.role);

      const userIds = participants.map(p => p.user_id).filter(id => id !== userId);
      const allUserIds = participants.map(p => p.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", allUserIds);

      if (profiles) {
        const map: Record<string, Participant> = {};
        profiles.forEach(p => { map[p.id] = p; });
        setParticipantsMap(map);
        if (!conv?.is_group && userIds.length > 0) {
          const other = profiles.find(p => p.id === userIds[0]);
          if (other) setOtherUser(other);
        }
      }
    }

    // Fetch messages
    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at, media_url, media_type")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) toast.error("Error al cargar mensajes");
    else setMessages(messagesData || []);

    // Fetch pinned message
    if (conv?.pinned_message_id) {
      const { data: pinned } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at, media_url, media_type")
        .eq("id", conv.pinned_message_id)
        .single();
      if (pinned) setPinnedMessage(pinned);
    } else {
      setPinnedMessage(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast.error("Solo se permiten imágenes y videos"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("El archivo no puede superar 20MB"); return; }
    const url = URL.createObjectURL(file);
    setMediaPreview({ file, url, type: isImage ? "image" : "video" });
  };

  const clearMediaPreview = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview.url);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${currentUserId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) { toast.error("Error al subir archivo"); return null; }
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const canSendMessage = (): boolean => {
    if (!convInfo?.is_group) return true;
    const isAdminOrOwner = currentRole === "owner" || currentRole === "admin";
    if (convInfo.admin_only_messages && !isAdminOrOwner) {
      toast.error("Solo los administradores pueden enviar mensajes");
      return false;
    }
    if (convInfo.slow_mode_seconds > 0 && !isAdminOrOwner) {
      const elapsed = (Date.now() - lastSentTime) / 1000;
      if (elapsed < convInfo.slow_mode_seconds) {
        const remaining = Math.ceil(convInfo.slow_mode_seconds - elapsed);
        toast.error(`Modo lento: espera ${remaining}s`);
        return false;
      }
    }
    return true;
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !mediaPreview) || !currentUserId || sending) return;
    if (!canSendMessage()) return;

    setSending(true);
    setUploading(!!mediaPreview);
    const content = newMessage.trim();
    setNewMessage("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    let mediaUrl: string | null = null;
    let mediaType = "text";

    if (mediaPreview) {
      mediaUrl = await uploadMedia(mediaPreview.file);
      mediaType = mediaPreview.type;
      clearMediaPreview();
      if (!mediaUrl && !content) { setSending(false); setUploading(false); return; }
    }

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId!,
      sender_id: currentUserId,
      content: content || "",
      media_url: mediaUrl,
      media_type: mediaType,
    });

    if (error) {
      toast.error("Error al enviar mensaje");
      setNewMessage(content);
    } else {
      setLastSentTime(Date.now());
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    }
    setSending(false);
    setUploading(false);
  };

  const handlePinMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ pinned_message_id: messageId })
      .eq("id", conversationId);

    if (error) toast.error("Error al fijar mensaje");
    else {
      const msg = messages.find(m => m.id === messageId);
      if (msg) setPinnedMessage(msg);
      setConvInfo(prev => prev ? { ...prev, pinned_message_id: messageId } : prev);
      toast.success("Mensaje fijado");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) toast.error("Error al eliminar");
    else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (pinnedMessage?.id === messageId) {
        setPinnedMessage(null);
        await supabase.from("conversations").update({ pinned_message_id: null }).eq("id", conversationId);
      }
      toast.success("Mensaje eliminado");
    }
  };

  const handleReportMessage = (messageId: string) => {
    setReportMessageId(messageId);
    setShowReportModal(true);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    return new Date(messages[index - 1].created_at).toDateString() !== new Date(messages[index].created_at).toDateString();
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const displayName = convInfo?.is_group
    ? convInfo.name || "Grupo"
    : otherUser?.display_name || otherUser?.username || "Usuario";

  const avatarInitial = displayName[0]?.toUpperCase() || "?";
  const isAdminOrOwner = currentRole === "owner" || currentRole === "admin";
  const inputDisabled = sending || (convInfo?.is_group && convInfo.admin_only_messages && !isAdminOrOwner);

  const scrollToPinnedMessage = () => {
    if (!pinnedMessage) return;
    const el = document.getElementById(`msg-${pinnedMessage.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="ios-header">
        <div className="flex items-center gap-1 px-2 py-2 min-h-[44px]">
          <Button variant="ghost" size="sm" onClick={() => navigate("/chats")} className="rounded-full h-9 px-2 gap-0.5 text-primary font-medium">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[15px]">Chats</span>
          </Button>

          <div
            className="flex items-center gap-2.5 flex-1 justify-center cursor-pointer -ml-12"
            onClick={() => {
              if (convInfo?.is_group) setShowGroupInfo(true);
              else if (otherUser) navigate(`/user/${otherUser.id}`);
            }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground text-sm font-semibold overflow-hidden">
              {!convInfo?.is_group && otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : convInfo?.is_group ? (
                <Users className="w-4 h-4" />
              ) : avatarInitial}
            </div>
            <div className="text-center">
              <h1 className="text-[15px] font-semibold leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {displayName}
              </h1>
              {convInfo?.is_group && (
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {Object.keys(participantsMap).length} miembros
                  {convInfo.slow_mode_seconds > 0 && " · 🐢"}
                  {convInfo.admin_only_messages && " · 🔒"}
                </p>
              )}
            </div>
          </div>

          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => convInfo?.is_group && setShowGroupInfo(true)}>
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Pinned message bar */}
      {pinnedMessage && (
        <button
          onClick={scrollToPinnedMessage}
          className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b border-border/50 hover:bg-muted/80 transition-colors"
        >
          <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-xs text-foreground truncate flex-1 text-left">
            <span className="font-medium text-primary">Fijado: </span>
            {pinnedMessage.content || "📷 Imagen"}
          </p>
        </button>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center mb-4 opacity-80">
              {!convInfo?.is_group && otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : convInfo?.is_group ? (
                <Users className="w-8 h-8 text-primary-foreground" />
              ) : (
                <span className="text-2xl font-bold text-primary-foreground">{avatarInitial}</span>
              )}
            </div>
            <p className="text-base font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{displayName}</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              {convInfo?.is_group ? "Envía un mensaje al grupo" : "Envía un mensaje para iniciar la conversación"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((message, index) => (
              <div key={message.id} id={`msg-${message.id}`}>
                {shouldShowDateSeparator(index) && <ChatDateSeparator dateStr={message.created_at} />}
                <ChatBubble
                  content={message.content}
                  time={formatTime(message.created_at)}
                  isOwn={message.sender_id === currentUserId}
                  mediaUrl={message.media_url}
                  mediaType={message.media_type}
                  senderName={participantsMap[message.sender_id]?.display_name || participantsMap[message.sender_id]?.username}
                  showSender={convInfo?.is_group || false}
                  onLongPress={() => {
                    setSelectedMessage(message);
                    setShowMessageActions(true);
                  }}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Media preview */}
      {mediaPreview && (
        <div className="px-3 pb-1">
          <div className="relative inline-block rounded-xl overflow-hidden border border-border bg-muted/50">
            {mediaPreview.type === "image" ? (
              <img src={mediaPreview.url} alt="" className="h-24 max-w-[200px] object-cover" />
            ) : (
              <video src={mediaPreview.url} className="h-24 max-w-[200px] object-cover" />
            )}
            <button onClick={clearMediaPreview} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border/50 bg-background/70 backdrop-blur-2xl px-3 py-2 pb-safe">
        {inputDisabled && convInfo?.admin_only_messages ? (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">Solo los administradores pueden enviar mensajes</p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all mb-[1px]"
            >
              <Image className="w-5 h-5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                placeholder={convInfo?.slow_mode_seconds ? `Mensaje (modo lento: ${convInfo.slow_mode_seconds}s)` : "Mensaje"}
                value={newMessage}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={!!inputDisabled}
                className="w-full resize-none rounded-[20px] bg-muted/50 border border-border/60 px-4 py-2 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-shadow max-h-[120px] leading-relaxed"
                style={{ minHeight: "36px" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !mediaPreview) || sending}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all mb-[1px]"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" /> : <Send className="w-4 h-4 text-primary-foreground ml-0.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Group Info Sheet */}
      {convInfo?.is_group && currentUserId && (
        <GroupInfoSheet
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          conversationId={conversationId!}
          currentUserId={currentUserId}
          onSettingsChanged={() => fetchConversationData(currentUserId)}
        />
      )}

      {/* Message Actions */}
      <MessageActionsSheet
        isOpen={showMessageActions}
        onClose={() => { setShowMessageActions(false); setSelectedMessage(null); }}
        messageContent={selectedMessage?.content || ""}
        messageId={selectedMessage?.id || ""}
        isOwn={selectedMessage?.sender_id === currentUserId}
        isAdmin={isAdminOrOwner}
        isGroup={convInfo?.is_group || false}
        onPin={handlePinMessage}
        onReport={handleReportMessage}
        onDelete={handleDeleteMessage}
      />

      {/* Report Modal */}
      {showReportModal && reportMessageId && (
        <ReportContentModal
          isOpen={showReportModal}
          onClose={() => { setShowReportModal(false); setReportMessageId(null); }}
          contentId={reportMessageId}
          contentType="message"
        />
      )}
    </div>
  );
};

export default ChatConversationPage;
