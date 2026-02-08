import { motion, AnimatePresence } from "framer-motion";
import { Pin, Flag, Trash2, Copy, X } from "lucide-react";
import { toast } from "sonner";

interface MessageActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  messageId: string;
  isOwn: boolean;
  isAdmin: boolean;
  isGroup: boolean;
  onPin?: (messageId: string) => void;
  onReport?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

const MessageActionsSheet = ({
  isOpen, onClose, messageContent, messageId,
  isOwn, isAdmin, isGroup, onPin, onReport, onDelete
}: MessageActionsSheetProps) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success("Mensaje copiado");
    onClose();
  };

  const actions = [
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
