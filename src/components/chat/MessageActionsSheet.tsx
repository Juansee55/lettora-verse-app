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
        className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          onClick={e => e.stopPropagation()}
          className="bg-card rounded-t-2xl w-full max-w-md overflow-hidden pb-safe"
        >
          {/* Reactions row */}
          {onReact && (
            <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-1">
              {REACTION_EMOJIS.map((emoji, i) => (
                <motion.button
                  key={emoji}
                  initial={{ scale: 0, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.03 * i }}
                  whileTap={{ scale: 0.75 }}
                  whileHover={{ scale: 1.2, y: -4 }}
                  onClick={() => { onReact(messageId, emoji); onClose(); }}
                  className="text-2xl w-11 h-11 rounded-full flex items-center justify-center hover:bg-muted/60 active:bg-muted"
                  aria-label={`Reaccionar con ${emoji}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          )}

          {/* Preview */}
          {messageContent && (
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 rounded-xl px-3 py-2">
                {messageContent}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="px-2 py-2">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  action.destructive
                    ? "text-destructive hover:bg-destructive/10"
                    : "hover:bg-muted/50"
                }`}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageActionsSheet;
