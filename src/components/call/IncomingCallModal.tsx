import { motion } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string | null;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal = ({
  isOpen,
  callerName,
  callerAvatar,
  isVideo,
  onAccept,
  onReject,
}: IncomingCallModalProps) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-3xl p-8 text-center max-w-sm w-full"
      >
        {/* Avatar */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold text-3xl overflow-hidden border-4 border-primary/20"
        >
          {callerAvatar ? (
            <img src={callerAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            callerName[0]?.toUpperCase() || "?"
          )}
        </motion.div>

        {/* Caller info */}
        <h2 className="text-2xl font-bold mb-2">{callerName}</h2>
        <p className="text-muted-foreground mb-8">
          {isVideo ? "Llamada de video" : "Llamada de voz"}
        </p>

        {/* Ringing animation */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mb-8 flex justify-center gap-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scaleY: [1, 1.5, 1] }}
              transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
              className="w-1 h-6 bg-primary rounded-full"
            />
          ))}
        </motion.div>

        {/* Buttons */}
        <div className="flex gap-4">
          {/* Reject */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReject}
            className="flex-1 h-12 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center gap-2 text-destructive font-semibold transition-colors hover:bg-destructive/30"
          >
            <PhoneOff className="w-5 h-5" />
            Rechazar
          </motion.button>

          {/* Accept */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAccept}
            className="flex-1 h-12 rounded-full bg-primary flex items-center justify-center gap-2 text-primary-foreground font-semibold transition-colors hover:bg-primary/90 shadow-lg shadow-primary/50"
          >
            <Phone className="w-5 h-5" />
            Aceptar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IncomingCallModal;
