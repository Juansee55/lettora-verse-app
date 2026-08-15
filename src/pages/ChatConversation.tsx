import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Send, Loader2, X, Users, Pin, Camera, Check as CheckIcon, Plus, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatDateSeparator from "@/components/chat/ChatDateSeparator";
import GroupInfoSheet from "@/components/chat/GroupInfoSheet";
import MessageActionsSheet from "@/components/chat/MessageActionsSheet";
import DirectChatSheet from "@/components/chat/DirectChatSheet";
import SharedContentSheet from "@/components/chat/SharedContentSheet";
import ReportContentModal from "@/components/reports/ReportContentModal";
import { useNameColors } from "@/hooks/useNameColors";
import VoiceMessageRecorder from "@/components/chat/VoiceMessageRecorder";
import EnhancedChatHeader from "@/components/chat/EnhancedChatHeader";
import CallInterface from "@/components/call/CallInterface";
import IncomingCallModal from "@/components/call/IncomingCallModal";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { resolveWallpaperBackground } from "@/lib/chatWallpapers";
import type { ReactionSummary } from "@/components/chat/ReactionsBar";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string;
  voice_duration?: number | null;
  reply_to_id?: string | null;
  edited_at?: string | null;
  is_deleted?: boolean | null;
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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showSharedContent, setShowSharedContent] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [readByUserAt, setReadByUserAt] = useState<Record<string, string | null>>({});
  const readChannelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const senderIds = [...new Set(messages.map(m => m.sender_id))];
  const nameColors = useNameColors(senderIds);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { callState, startCall, acceptCall, rejectCall, endCall, toggleMute, toggleVideo, formatCallDuration, localVideoRef, remoteVideoRef } = useWebRTCCall();
  const { isTyping: otherIsTyping, notifyTyping } = useTypingIndicator(conversationId!, currentUserId, privacyLoaded && showTypingIndicator);

  useEffect(() => {
    let mounted = true;
    const checkUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { navigate("/auth"); return; }
      setCurrentUserId(user.id);
      await fetchConversationData(user.id);
      // Load chat privacy and wallpaper preferences.
      const { data: profile } = await supabase
        .from("profiles")
        .select("chat_wallpaper, show_typing_indicator, show_read_receipts" as any)
        .eq("id", user.id)
        .maybeSingle();
      if (mounted && profile) {
        setWallpaper((profile as any).chat_wallpaper ?? null);
        setShowTypingIndicator((profile as any).show_typing_indicator ?? true);
        setShowReadReceipts((profile as any).show_read_receipts ?? true);
      }
      if (mounted) setPrivacyLoaded(true);
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
      }, async (payload) => {
        const incoming = payload.new as Message;
        if (incoming.sender_id !== currentUserId && showReadReceipts) {
          await updateLastRead(currentUserId);
        }
        setMessages(prev => {
          if (prev.find(m => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? { ...m, ...(payload.new as Message) } : m)))
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id)))
      .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId, showReadReceipts]);

  useEffect(() => {
    if (!conversationId || !currentUserId || !privacyLoaded) return;
    const channel = supabase
      .channel(`read-receipts:${conversationId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "read" }, ({ payload }) => {
        const from = (payload as any)?.user_id as string | undefined;
        const at = (payload as any)?.last_read_at as string | undefined;
        if (!from || from === currentUserId || !at) return;
        setReadByUserAt(prev => ({ ...prev, [from]: at }));
      });
    readChannelRef.current = channel;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && showReadReceipts) {
        void updateLastRead(currentUserId);
      }
    });
    return () => {
      if (readChannelRef.current === channel) readChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, privacyLoaded, showReadReceipts]);

  // Reactions realtime + initial load
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    const load = async () => {
      const ids = messages.map(m => m.id);
      if (!ids.length) { setReactions({}); return; }
      const { data } = await (supabase.from("message_reactions") as any)
        .select("message_id, emoji, user_id")
        .in("message_id", ids);
      if (cancelled || !data) return;
      const map: Record<string, { emoji: string; user_id: string }[]> = {};
      (data as any[]).forEach(r => {
        (map[r.message_id] ||= []).push({ emoji: r.emoji, user_id: r.user_id });
      });
      setReactions(map);
    };
    load();
    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.new as any;
        setReactions(prev => {
          const arr = prev[r.message_id] || [];
          if (arr.some(x => x.user_id === r.user_id && x.emoji === r.emoji)) return prev;
          return { ...prev, [r.message_id]: [...arr, { emoji: r.emoji, user_id: r.user_id }] };
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.old as any;
        setReactions(prev => {
          const arr = prev[r.message_id];
          if (!arr) return prev;
          return { ...prev, [r.message_id]: arr.filter(x => !(x.user_id === r.user_id && x.emoji === r.emoji)) };
        });
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [conversationId, messages.length]);

  const summarizeReactions = (msgId: string): ReactionSummary[] => {
    const arr = reactions[msgId] || [];
    const grouped: Record<string, { count: number; mine: boolean }> = {};
    arr.forEach(r => {
      const g = (grouped[r.emoji] ||= { count: 0, mine: false });
      g.count += 1;
      if (r.user_id === currentUserId) g.mine = true;
    });
    return Object.entries(grouped).map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    const arr = reactions[messageId] || [];
    const existing = arr.find(r => r.user_id === currentUserId && r.emoji === emoji);
    if (existing) {
      // Optimistic
      setReactions(prev => ({ ...prev, [messageId]: (prev[messageId] || []).filter(x => !(x.user_id === currentUserId && x.emoji === emoji)) }));
      await (supabase.from("message_reactions") as any)
        .delete()
        .eq("message_id", messageId).eq("user_id", currentUserId).eq("emoji", emoji);
    } else {
      setReactions(prev => ({ ...prev, [messageId]: [...(prev[messageId] || []), { emoji, user_id: currentUserId }] }));
      const { error } = await (supabase.from("message_reactions") as any)
        .insert({ message_id: messageId, user_id: currentUserId, emoji });
      if (error && error.code !== "23505") {
        toast.error("No se pudo reaccionar");
        setReactions(prev => ({ ...prev, [messageId]: (prev[messageId] || []).filter(x => !(x.user_id === currentUserId && x.emoji === emoji)) }));
      }
    }
  };

  const fetchConversationData = async (userId: string) => {
    setLoading(true);
    try {
      // Parallel fetch to speed up
      const [convRes, participantsRes, messagesRes] = await Promise.all([
        supabase.from("conversations").select("*").eq("id", conversationId).single(),
        supabase.from("conversation_participants").select("user_id, role, last_read_at").eq("conversation_id", conversationId),
        supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true })
      ]);

      if (convRes.data) setConvInfo(convRes.data as ConvInfo);
      if (messagesRes.data) setMessages(messagesRes.data || []);

      if (participantsRes.data) {
        const participants = participantsRes.data;
        const myPart = participants.find(p => p.user_id === userId);
        if (myPart) setCurrentRole(myPart.role);
        setReadByUserAt(Object.fromEntries(participants.map((participant: any) => [participant.user_id, participant.last_read_at ?? null])));

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
    if (!conversationId || !showReadReceipts) return;
    const lastReadAt = new Date().toISOString();
    const { error } = await supabase.from("conversation_participants")
      .update({ last_read_at: lastReadAt })
      .eq("conversation_id", conversationId).eq("user_id", userId);
    if (error) return;
    setReadByUserAt(prev => ({ ...prev, [userId]: lastReadAt }));
    await readChannelRef.current?.send({
      type: "broadcast",
      event: "read",
      payload: { user_id: userId, last_read_at: lastReadAt },
    });
  };

  const hasBeenReadByRecipient = (message: Message) => {
    if (!showReadReceipts || message.sender_id !== currentUserId) return false;
    const participantIds = Object.keys(readByUserAt).filter(id => id !== currentUserId);
    if (participantIds.length === 0) return false;
    const messageTime = new Date(message.created_at).getTime();
    return convInfo?.is_group
      ? participantIds.every(id => {
          const lastRead = readByUserAt[id];
          return !!lastRead && new Date(lastRead).getTime() >= messageTime;
        })
      : participantIds.some(id => {
          const lastRead = readByUserAt[id];
          return !!lastRead && new Date(lastRead).getTime() >= messageTime;
        });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowAttachmentMenu(false);
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

    // Handle edit flow
    if (editingId) {
      const content = newMessage.trim();
      setSending(true);
      const { error } = await (supabase.from("messages") as any)
        .update({ content, edited_at: new Date().toISOString() })
        .eq("id", editingId);
      setSending(false);
      if (error) { toast.error("Error al editar"); return; }
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content, edited_at: new Date().toISOString() } : m));
      setEditingId(null);
      setNewMessage("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      return;
    }

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

    const payload: any = {
      conversation_id: conversationId!, sender_id: currentUserId,
      content: content || "", media_url: mediaUrl, media_type: mediaType,
    };
    if (replyTo) payload.reply_to_id = replyTo.id;
    const { error } = await (supabase.from("messages") as any).insert(payload);

    if (error) { toast.error("Error al enviar mensaje"); setNewMessage(content); }
    else {
      setLastSentTime(Date.now());
      setReplyTo(null);
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
    // Soft-delete: keep placeholder in thread
    const { error } = await (supabase.from("messages") as any)
      .update({ is_deleted: true, content: "", media_url: null })
      .eq("id", messageId);
    if (error) toast.error("Error al eliminar");
    else {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: "", media_url: null } : m));
      if (pinnedMessage?.id === messageId) {
        setPinnedMessage(null);
        await supabase.from("conversations").update({ pinned_message_id: null }).eq("id", conversationId);
      }
      toast.success("Mensaje eliminado");
    }
  };

  const handleReplyTo = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    setReplyTo(msg);
    setEditingId(null);
    inputRef.current?.focus();
  };

  const handleEditStart = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || msg.is_deleted) return;
    setEditingId(messageId);
    setNewMessage(msg.content || "");
    setReplyTo(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEditOrReply = () => {
    setEditingId(null);
    setReplyTo(null);
    if (editingId) setNewMessage("");
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

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const messagesById = useMemo(() => {
    const m: Record<string, Message> = {};
    messages.forEach(x => { m[x.id] = x; });
    return m;
  }, [messages]);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <EnhancedChatHeader
        title={displayName}
        subtitle={convInfo?.is_group ? `${Object.keys(participantsMap).length} miembros` : otherUser?.username ? `@${otherUser.username}` : "Conversación privada"}
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
      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{ background: resolveWallpaperBackground(wallpaper) }}
      >
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
                  onDoubleTap={() => toggleReaction(message.id, "❤️")}
                  reactions={summarizeReactions(message.id)}
                  onToggleReaction={(emoji) => toggleReaction(message.id, emoji)}
                  isEdited={!!message.edited_at}
                  isDeleted={!!message.is_deleted}
                  readByRecipient={hasBeenReadByRecipient(message)}
                  readReceiptsEnabled={showReadReceipts}
                  replyPreview={message.reply_to_id && messagesById[message.reply_to_id] ? {
                    author: participantsMap[messagesById[message.reply_to_id].sender_id]?.display_name
                      || participantsMap[messagesById[message.reply_to_id].sender_id]?.username
                      || "Usuario",
                    content: messagesById[message.reply_to_id].content || "",
                    onJump: () => scrollToMessage(message.reply_to_id!),
                  } : null}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="relative border-t border-border/35 bg-background/88 px-3 pb-safe pt-2.5 shadow-[0_-12px_32px_hsl(var(--background)/0.22)] backdrop-blur-2xl">
        <AnimatePresence>
          {showAttachmentMenu && !inputDisabled && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="absolute bottom-[calc(100%+8px)] left-3 z-30 w-[220px] overflow-hidden rounded-[22px] border border-border/55 bg-card/95 p-1.5 shadow-[0_20px_40px_hsl(var(--foreground)/0.16)] backdrop-blur-2xl"
            >
              <button
                type="button"
                onClick={() => { setShowAttachmentMenu(false); fileInputRef.current?.click(); }}
                className="flex w-full items-center gap-3 rounded-[17px] px-3 py-3 text-left transition-colors hover:bg-primary/[0.08]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ImagePlus className="h-[18px] w-[18px]" /></span>
                <span><span className="block text-[13px] font-bold">Fotos y vídeos</span><span className="block text-[11px] text-muted-foreground">Elige desde tu dispositivo</span></span>
              </button>
              <button
                type="button"
                onClick={() => { setShowAttachmentMenu(false); cameraInputRef.current?.click(); }}
                className="flex w-full items-center gap-3 rounded-[17px] px-3 py-3 text-left transition-colors hover:bg-primary/[0.08]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Camera className="h-[18px] w-[18px]" /></span>
                <span><span className="block text-[13px] font-bold">Abrir cámara</span><span className="block text-[11px] text-muted-foreground">Captura y comparte al instante</span></span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {(replyTo || editingId) && (
          <div className="mb-2.5 flex items-center gap-2.5 rounded-2xl border border-primary/18 bg-primary/[0.075] px-3 py-2">
            <div className="h-8 w-1 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold leading-tight text-primary">
                {editingId ? "Editando mensaje" : `Respondiendo a ${participantsMap[replyTo!.sender_id]?.display_name || participantsMap[replyTo!.sender_id]?.username || "Usuario"}`}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{(editingId ? messages.find(m => m.id === editingId)?.content : replyTo?.content) || "Adjunto"}</p>
            </div>
            <button type="button" onClick={cancelEditOrReply} className="flex h-7 w-7 items-center justify-center rounded-xl bg-background/55 text-muted-foreground transition-colors hover:bg-background hover:text-foreground" aria-label="Cancelar respuesta o edición">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {mediaPreview && (
          <div className="mb-2.5">
            <div className="relative inline-block overflow-hidden rounded-2xl border border-border/55 bg-muted/30 shadow-sm">
              {mediaPreview.type === "image" ? (
                <img src={mediaPreview.url} alt="Vista previa del adjunto" className="h-28 max-w-[220px] object-cover" />
              ) : (
                <video src={mediaPreview.url} className="h-28 max-w-[220px] object-cover" />
              )}
              <button type="button" onClick={clearMediaPreview} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-xl bg-black/55 text-white backdrop-blur-sm" aria-label="Quitar adjunto">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {inputDisabled && convInfo?.admin_only_messages ? (
          <div className="py-3 text-center">
            <p className="text-[13px] text-muted-foreground/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>Solo los administradores pueden enviar mensajes</p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowAttachmentMenu((current) => !current)}
              className={`mb-[2px] flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] transition-all active:scale-95 ${showAttachmentMenu ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25" : "bg-muted/55 text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
              aria-label={showAttachmentMenu ? "Cerrar adjuntos" : "Abrir adjuntos"}
            >
              {showAttachmentMenu ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleFileSelect} />
            <VoiceMessageRecorder onSendVoice={handleVoiceSend} disabled={!!inputDisabled} />
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                placeholder={convInfo?.slow_mode_seconds ? `Mensaje (🐢 ${convInfo.slow_mode_seconds}s)` : "Escribe un mensaje…"}
                value={newMessage}
                onChange={(event) => { handleTextareaInput(event); notifyTyping(); }}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={!!inputDisabled}
                className="max-h-[120px] min-h-10 w-full resize-none rounded-[19px] border border-border/45 bg-muted/38 py-2.5 pl-3.5 pr-10 text-[14px] leading-relaxed placeholder:text-muted-foreground/45 transition-all focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/12"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Adjuntar foto o vídeo"
              >
                <ImagePlus className="h-[17px] w-[17px]" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={(!newMessage.trim() && !mediaPreview) || sending}
              className="mb-[2px] flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-all active:scale-95 disabled:opacity-30"
              aria-label={editingId ? "Guardar edición" : "Enviar mensaje"}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <CheckIcon className="h-4 w-4" /> : <Send className="ml-0.5 h-4 w-4" />}
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
          wallpaperValue={wallpaper}
          onWallpaperChange={setWallpaper}
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
          onSharedContent={() => setShowSharedContent(true)}
          wallpaperValue={wallpaper}
          onWallpaperChange={setWallpaper}
        />
      )}

      <SharedContentSheet
        isOpen={showSharedContent}
        onClose={() => setShowSharedContent(false)}
        messages={messages}
      />

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
        onReply={handleReplyTo}
        onEdit={handleEditStart}
        onReact={(id, emoji) => toggleReaction(id, emoji)}
        canEdit={!selectedMessage?.is_deleted && !selectedMessage?.media_url}
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
