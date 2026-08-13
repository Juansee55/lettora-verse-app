import { motion, AnimatePresence } from "framer-motion";
import { Pin, Flag, Trash2, Copy, X, Ban, Reply, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REACTION_EMOJIS } from "@/lib/chatWallpapers";

interface MessageActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  messageId: string;
  isOwn: boolean;
  isAdmin: boolean;
  isGroup: boolean;
  senderId?: string;
  onPin?: (messageId: string) => void;
  onReport?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  canEdit?: boolean;
}

const MessageActionsSheet = ({
  isOpen, onClose, messageContent, messageId,
  isOwn, isAdmin, isGroup, senderId, onPin, onReport, onDelete,
  onReply, onEdit, onReact, canEdit,
}: MessageActionsSheetProps) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success("Mensaje copiado");
    onClose();
  };

  const handleBlock = async () => {
    if (!senderId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_blocks").insert({
      blocker_id: user.id,
      blocked_id: senderId,
    } as any);

    if (error) {
      if (error.code === "23505") toast.info("Usuario ya bloqueado");
      else toast.error("Error al bloquear");
    } else {
      // Remove mutual follows
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", senderId);
      await supabase.from("followers").delete().eq("follower_id", senderId).eq("following_id", user.id);
      toast.success("Usuario bloqueado");
    }
    onClose();
  };

  const actions = [
    {
      icon: Reply,
      label: "Responder",
      show: !!onReply,
      onClick: () => { onReply?.(messageId); onClose(); },
      destructive: false,
    },
    {
      icon: Pencil,
      label: "Editar mensaje",
      show: !!canEdit && isOwn && !!messageContent,
      onClick: () => { onEdit?.(messageId); onClose(); },
      destructive: false,
    },
    {
      icon: Copy,
      label: "Copiar texto",
      show: !!messageContent,
      onClick: handleCopy,
      destructive: false,
    },
    {
      icon: Pin,
      label: "Fijar mensaje",
      show: isGroup && isAdmin,
      onClick: () => { onPin?.(messageId); onClose(); },
      destructive: false,
    },
    {
      icon: Ban,
      label: "Bloquear usuario",
      show: !isOwn && !!senderId,
      onClick: handleBlock,
      destructive: true,
    },
    {
      icon: Flag,
      label: "Reportar mensaje",
      show: !isOwn,
      onClick: () => { onReport?.(messageId); onClose(); },
      destructive: false,
    },
    {
      icon: Trash2,
      label: "Eliminar mensaje",
      show: isOwn || isAdmin,
      onClick: () => { onDelete?.(messageId); onClose(); },
      destructive: true,
    },
  ].filter(a => a.show);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.section
          initial={{ y: 44, opacity: 0, scale: 0.985 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 44, opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          onClick={event => event.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-t-[30px] border border-border/45 bg-card/95 pb-safe shadow-2xl backdrop-blur-2xl"
          aria-label="Acciones del mensaje"
        >
          <div className="flex justify-center pb-1 pt-3"><div className="h-1 w-10 rounded-full bg-muted-foreground/25" /></div>

          {onReact && (
            <div className="mx-4 mt-2 flex items-center justify-between gap-0.5 rounded-[22px] border border-border/40 bg-muted/35 px-2 py-1.5">
              {REACTION_EMOJIS.map((emoji, i) => (
                <motion.button
                  key={emoji}
                  initial={{ scale: 0, y: 8 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 19, delay: 0.025 * i }}
                  whileTap={{ scale: 0.78 }}
                  whileHover={{ scale: 1.15, y: -3 }}
                  onClick={() => { onReact(messageId, emoji); onClose(); }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-[23px] transition-colors hover:bg-background/70"
                  aria-label={`Reaccionar con ${emoji}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          )}

          {messageContent && (
            <div className="px-4 pb-2 pt-3">
              <p className="line-clamp-2 rounded-2xl border border-border/35 bg-muted/25 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">{messageContent}</p>
            </div>
          )}

          <div className="space-y-2 px-4 pb-4 pt-1">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.985] ${
                  action.destructive
                    ? "border-destructive/15 bg-destructive/[0.055] text-destructive hover:bg-destructive/10"
                    : "border-border/45 bg-muted/28 hover:border-primary/20 hover:bg-primary/[0.055]"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.destructive ? "bg-destructive/10" : "bg-primary/10 text-primary"}`}>
                  <action.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 text-[14px] font-semibold">{action.label}</span>
                <span className="text-[17px] leading-none opacity-35 transition-transform group-hover:translate-x-0.5">›</span>
              </button>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageActionsSheet;
