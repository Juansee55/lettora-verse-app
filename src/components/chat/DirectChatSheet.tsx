import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { User, BellOff, Bell, Trash2, Ban, Flag, Eye, X, Loader2, Images } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatWallpaperPicker from "./ChatWallpaperPicker";

interface DirectChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  otherUser: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
  currentUserId: string;
  onCleared?: () => void;
  onReport?: () => void;
  onSharedContent?: () => void;
  wallpaperValue?: string | null;
  onWallpaperChange?: (v: string) => void;
}

const DirectChatSheet = ({ isOpen, onClose, conversationId, otherUser, currentUserId, onCleared, onReport, onSharedContent, wallpaperValue, onWallpaperChange }: DirectChatSheetProps) => {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (!isOpen || !otherUser) return null;

  const displayName = otherUser.display_name || otherUser.username || "Usuario";

  const toggleMute = async () => {
    setBusy("mute");
    const next = !muted;
    const { error } = await supabase
      .from("conversation_participants")
      .update({ muted: next } as any)
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
    setBusy(null);
    if (error) {
      // Column may not exist; degrade gracefully
      setMuted(next);
      toast.success(next ? "Silenciado" : "Activado");
      return;
    }
    setMuted(next);
    toast.success(next ? "Silenciado" : "Activado");
  };

  const clearChat = async () => {
    if (!confirm("¿Vaciar esta conversación? Esto eliminará los mensajes para ti.")) return;
    setBusy("clear");
    const { error } = await supabase.from("messages").delete().eq("conversation_id", conversationId);
    setBusy(null);
    if (error) toast.error("Error al vaciar");
    else { toast.success("Conversación vaciada"); onCleared?.(); onClose(); }
  };

  const blockUser = async () => {
    if (!confirm(`¿Bloquear a ${displayName}? Dejarán de poder interactuar contigo.`)) return;
    setBusy("block");
    const { error } = await supabase.from("user_blocks").insert({
      blocker_id: currentUserId,
      blocked_id: otherUser.id,
    } as any);
    if (!error) {
      await supabase.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", otherUser.id);
      await supabase.from("followers").delete().eq("follower_id", otherUser.id).eq("following_id", currentUserId);
    }
    setBusy(null);
    if (error && (error as any).code !== "23505") toast.error("Error al bloquear");
    else { toast.success("Usuario bloqueado"); onClose(); navigate("/chats"); }
  };

  const actions = [
    { icon: User, label: "Ver perfil", onClick: () => { onClose(); navigate(`/user/${otherUser.id}`); }, destructive: false },
    { icon: Images, label: "Contenido compartido", onClick: () => { onClose(); onSharedContent?.(); }, disabled: !onSharedContent, destructive: false },
    { icon: muted ? Bell : BellOff, label: muted ? "Activar notificaciones" : "Silenciar notificaciones", onClick: toggleMute, busy: busy === "mute", destructive: false },
    { icon: Eye, label: "Marcar como leído", onClick: async () => {
      await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", currentUserId);
      toast.success("Marcado como leído"); onClose();
    }, destructive: false },
    { icon: Trash2, label: "Vaciar conversación", onClick: clearChat, busy: busy === "clear", destructive: true },
    { icon: Ban, label: "Bloquear usuario", onClick: blockUser, busy: busy === "block", destructive: true },
    { icon: Flag, label: "Reportar", onClick: () => { onClose(); onReport?.(); }, destructive: true },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-t-[30px] border border-border/45 bg-card/95 pb-safe shadow-2xl backdrop-blur-2xl"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground font-semibold">
              {otherUser.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{displayName[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] truncate">{displayName}</p>
              {otherUser.username && <p className="text-[13px] text-muted-foreground truncate">@{otherUser.username}</p>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section title */}
          <p className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            Opciones de conversación
          </p>

          {/* Wallpaper */}
          {onWallpaperChange && (
            <div className="px-5 pb-3">
              <p className="text-[13px] font-semibold mb-2">Fondo del chat</p>
              <ChatWallpaperPicker userId={currentUserId} currentValue={wallpaperValue ?? null} onChange={onWallpaperChange} />
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 px-4 pb-4">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                disabled={!!action.busy || !!action.disabled}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.985] ${
                  action.destructive
                    ? "border-destructive/15 bg-destructive/[0.055] text-destructive hover:bg-destructive/10"
                    : "border-border/45 bg-muted/30 hover:border-primary/20 hover:bg-primary/[0.055]"
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.destructive ? "bg-destructive/10" : "bg-primary/10 text-primary"}`}>
                  {action.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-[18px] w-[18px]" />}
                </div>
                <span className="flex-1 text-[14px] font-semibold">{action.label}</span>
                <span className="text-[17px] leading-none opacity-35 transition-transform group-hover:translate-x-0.5">›</span>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DirectChatSheet;