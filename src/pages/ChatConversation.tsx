import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, Loader2, X, Users, Pin, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatDateSeparator from "@/components/chat/ChatDateSeparator";
import GroupInfoSheet from "@/components/chat/GroupInfoSheet";
import MessageActionsSheet from "@/components/chat/MessageActionsSheet";
import DirectChatSheet from "@/components/chat/DirectChatSheet";
import ReportContentModal from "@/components/reports/ReportContentModal";
import { useNameColors } from "@/hooks/useNameColors";
import VoiceMessageRecorder from "@/components/chat/VoiceMessageRecorder";
import EnhancedChatHeader from "@/components/chat/EnhancedChatHeader";
import CallInterface from "@/components/call/CallInterface";
import IncomingCallModal from "@/components/call/IncomingCallModal";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string;
  voice_duration?: number | null;
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
  const [showDirectInfo, setShowDirectInfo] = useState(false);
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
  const senderIds = [...new Set(messages.map(m => m.sender_id))];
  const nameColors = useNameColors(senderIds);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { callState, startCall, acceptCall, rejectCall, endCall, toggleMute, toggleVideo, formatCallDuration, localVideoRef, remoteVideoRef } = useWebRTCCall();
  const { isTyping: otherIsTyping, notifyTyping } = useTypingIndicator(conversationId!, currentUserId);

  useEffect(() => {
    let mounted = true;
    const checkUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { navigate("/auth"); return; }
      setCurrentUserId(user.id);
      await fetchConversationData(user.id);
      await updateLastRead(user.id);
    };
    checkUserAndFetch();
    return () => { mounted = false; };
  }, [conversationId]);

  useEffect(() => { 
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }
  }, [messages.length]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => setMessages(prev => {
        if (prev.find(m => m.id === (payload.new as Message).id)) return prev;
        return [...prev, payload.new as Message];
      }))
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  const fetchConversationData = async (userId: string) => {
    setLoading(true);
    try {
      // Parallel fetch to speed up
      const [convRes, participantsRes, messagesRes] = await Promise.all([
        supabase.from("conversations").select("*").eq("id", conversationId).single(),
        supabase.from("conversation_participants").select("user_id, role").eq("conversation_id", conversationId),
        supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true })
      ]);

      if (convRes.data) setConvInfo(convRes.data as ConvInfo);
      if (messagesRes.data) setMessages(messagesRes.data || []);

      if (participantsRes.data) {
        const participants = participantsRes.data;
        const myPart = participants.find(p => p.user_id === userId);
        if (myPart) setCurrentRole(myPart.role);

        const allUserIds = participants.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", allUserIds);

        if (profiles) {
          const map: Record<string, Participant> = {};
          profiles.forEach(p => { map[p.id] = p; });
          setParticipantsMap(map);
          if (!convRes.data?.is_group) {
            const otherId = allUserIds.find(id => id !== userId);
            if (otherId) setOtherUser(map[otherId]);
          }
        }
      }
    } catch (err) {
      console.error("Error loading chat data:", err);
      toast.error("Error al cargar la conversación");
    } finally {
      setLoading(false);
    }
  };



  const updateLastRead = async (userId: string) => {
    await supabase.from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId).eq("user_id", userId);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast.error("Solo se permiten imágenes y videos"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("El archivo no puede superar 20MB"); return; }
    setMediaPreview({ file, url: URL.createObjectURL(file), type: isImage ? "image" : "video" });
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
    const { data: signed } = await supabase.storage
      .from("chat-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed?.signedUrl ?? null;
  };

  const uploadVoiceMessage = async (audioBlob: Blob): Promise<string | null> => {
    if (!currentUserId) return null;
    const safeId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const path = `${currentUserId}/voice-${safeId}.webm`;
    const file = new File([audioBlob], `voice-${safeId}.webm`, { type: audioBlob.type || "audio/webm" });

    const { error } = await supabase.storage.from("chat-media").upload(path, file, {
      contentType: file.type || "audio/webm",
      upsert: false,
    });

    if (error) {
      console.error("Error subiendo audio:", error);
      toast.error("No se pudo subir el audio");
      return null;
    }

    const { data: signed } = await supabase.storage
      .from("chat-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 año
    return signed?.signedUrl ?? null;
  };

  const canSendMessage = (): boolean => {
    if (!convInfo?.is_group) return true;
    const isAdm = currentRole === "owner" || currentRole === "admin";
    if (convInfo.admin_only_messages && !isAdm) { toast.error("Solo los administradores pueden enviar mensajes"); return false; }
    if (convInfo.slow_mode_seconds > 0 && !isAdm) {
      const elapsed = (Date.now() - lastSentTime) / 1000;
      if (elapsed < convInfo.slow_mode_seconds) { toast.error(`Modo lento: espera ${Math.ceil(convInfo.slow_mode_seconds - elapsed)}s`); return false; }
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
      conversation_id: conversationId!, sender_id: currentUserId,
      content: content || "", media_url: mediaUrl, media_type: mediaType,
    });

    if (error) { toast.error("Error al enviar mensaje"); setNewMessage(content); }
    else {
      setLastSentTime(Date.now());
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    }
    setSending(false);
    setUploading(false);
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!currentUserId || !conversationId || sending) return;
    if (!canSendMessage()) return;

    setSending(true);
    setUploading(true);

    try {
      const mediaUrl = await uploadVoiceMessage(audioBlob);
      if (!mediaUrl) return;

      const voiceMessagePayload = {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: "",
        media_url: mediaUrl,
        media_type: "voice",
        voice_duration: Math.max(0, Math.round(duration)),
      } as any;

      const { error } = await (supabase.from("messages") as any).insert(voiceMessagePayload);

      if (error) {
        console.error("Error enviando audio:", error);
        toast.error("Error al enviar audio");
        return;
      }

      setLastSentTime(Date.now());
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
      toast.success("Audio enviado");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    const { error } = await supabase.from("conversations").update({ pinned_message_id: messageId }).eq("id", conversationId);
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

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

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
  const inputDisabled = sending || uploading || (convInfo?.is_group && convInfo.admin_only_messages && !isAdminOrOwner);
  const incomingCaller = callState.incomingCall?.fromUserId
    ? participantsMap[callState.incomingCall.fromUserId] || otherUser
    : otherUser;
  const callRemoteUser = callState.remoteUserId
    ? participantsMap[callState.remoteUserId] || otherUser
    : otherUser;

  const scrollToPinnedMessage = () => {
    if (!pinnedMessage) return;
    const el = document.getElementById(`msg-${pinnedMessage.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <EnhancedChatHeader
        title={displayName}
        subtitle={convInfo?.is_group ? `${Object.keys(participantsMap).length} miembros` : undefined}
        avatarUrl={!convInfo?.is_group ? otherUser?.avatar_url : undefined}
        isTyping={otherIsTyping}
        onBack={() => navigate("/chats")}
        onMore={() => {
          if (convInfo?.is_group) setShowGroupInfo(true);
          else setShowDirectInfo(true);
        }}
        onCall={!convInfo?.is_group && otherUser ? () => startCall(otherUser.id, false) : undefined}
        onVideoCall={!convInfo?.is_group && otherUser ? () => startCall(otherUser.id, true) : undefined}
      />

      {/* Call Interfaces */}
      <CallInterface
        isActive={callState.isCallActive}
        isVideo={callState.isVideoCall}
        isMuted={callState.isMuted}
        isVideoEnabled={callState.isVideoEnabled}
        duration={formatCallDuration(callState.callDuration)}
        remoteUserName={callRemoteUser?.display_name || callRemoteUser?.username || "Usuario"}
        remoteUserAvatar={callRemoteUser?.avatar_url}
        onEndCall={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
      />

      <IncomingCallModal
        isOpen={callState.isCallIncoming}
        callerName={incomingCaller?.display_name || incomingCaller?.username || "Usuario"}
        callerAvatar={incomingCaller?.avatar_url}
        isVideo={callState.incomingCall?.isVideo ?? callState.isVideoCall}
        onAccept={acceptCall}
        onReject={rejectCall}
      />

      {/* Pinned message bar */}
      {pinnedMessage && (
        <button
          onClick={scrollToPinnedMessage}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-primary/5 border-b border-primary/10 hover:bg-primary/10 transition-colors"
        >
          <Pin className="w-3.5 h-3.5 text-primary shrink-0 rotate-45" />
          <p className="text-[13px] text-foreground truncate flex-1 text-left" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span className="font-semibold text-primary">Fijado </span>
            {pinnedMessage.content || "📷 Imagen"}
          </p>
        </button>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-7 h-7 animate-spin text-primary/50" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/15 to-primary/30 flex items-center justify-center mb-5">
              {!convInfo?.is_group && otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : convInfo?.is_group ? (
                <Users className="w-10 h-10 text-primary/60" />
              ) : (
                <span className="text-3xl font-bold text-primary/60">{avatarInitial}</span>
              )}
            </div>
            <p className="text-lg font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{displayName}</p>
            <p className="text-[14px] text-muted-foreground/60 mt-1.5">
              {convInfo?.is_group ? "Envía un mensaje al grupo" : "Envía un mensaje para iniciar la conversación"}
            </p>
          </div>
        ) : (
          <div className="space-y-[3px]">
            {messages.map((message, index) => (
              <div key={message.id} id={`msg-${message.id}`}>
                {shouldShowDateSeparator(index) && <ChatDateSeparator dateStr={message.created_at} />}
                <ChatBubble
                  content={message.content}
                  time={formatTime(message.created_at)}
                  isOwn={message.sender_id === currentUserId}
                  mediaUrl={message.media_url}
                  mediaType={message.media_type}
                  voiceDuration={message.voice_duration}
                  senderName={participantsMap[message.sender_id]?.display_name || participantsMap[message.sender_id]?.username}
                  senderNameColorClass={nameColors[message.sender_id]}
                  senderAvatarUrl={participantsMap[message.sender_id]?.avatar_url}
                  showSender={convInfo?.is_group || false}
                  onAvatarClick={() => navigate(`/user/${message.sender_id}`)}
                  onLongPress={() => { setSelectedMessage(message); setShowMessageActions(true); }}
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
          <div className="relative inline-block rounded-2xl overflow-hidden border border-border/50 bg-muted/30 shadow-sm">
            {mediaPreview.type === "image" ? (
              <img src={mediaPreview.url} alt="" className="h-28 max-w-[220px] object-cover" />
            ) : (
              <video src={mediaPreview.url} className="h-28 max-w-[220px] object-cover" />
            )}
            <button onClick={clearMediaPreview} className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border/30 bg-background/80 backdrop-blur-2xl px-3 py-2 pb-safe">
        {inputDisabled && convInfo?.admin_only_messages ? (
          <div className="text-center py-3">
            <p className="text-[13px] text-muted-foreground/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>Solo los administradores pueden enviar mensajes</p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-90 transition-all mb-[2px]"
            >
              <Camera className="w-[18px] h-[18px]" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            <VoiceMessageRecorder
              onSendVoice={handleVoiceSend}
              disabled={!!inputDisabled}
            />
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                placeholder={convInfo?.slow_mode_seconds ? `Mensaje (🐢 ${convInfo.slow_mode_seconds}s)` : "Mensaje"}
                value={newMessage}
                onChange={(e) => {
                  handleTextareaInput(e);
                  notifyTyping();
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={!!inputDisabled}
                className="w-full resize-none rounded-[22px] bg-muted/30 border border-border/40 px-4 py-2.5 text-[15px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 transition-all max-h-[120px] leading-relaxed"
                style={{ minHeight: "40px", fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !mediaPreview) || sending}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all mb-[2px] shadow-sm shadow-primary/20"
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

      {/* Direct (1-to-1) chat settings */}
      {!convInfo?.is_group && currentUserId && otherUser && (
        <DirectChatSheet
          isOpen={showDirectInfo}
          onClose={() => setShowDirectInfo(false)}
          conversationId={conversationId!}
          otherUser={otherUser}
          currentUserId={currentUserId}
          onCleared={() => setMessages([])}
          onReport={() => { setReportMessageId(conversationId!); setShowReportModal(true); }}
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
        senderId={selectedMessage?.sender_id}
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
