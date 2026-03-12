import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
}

const QRCodeModal = ({ isOpen, onClose, url, title, subtitle, accentColor = "hsl(var(--primary))" }: QRCodeModalProps) => {
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Enlace copiado", description: "Se ha copiado el enlace al portapapeles" });
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast({ title: "Enlace copiado" });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative liquid-glass-strong rounded-3xl p-6 w-full max-w-[320px] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-[17px] font-semibold mb-1">{title}</h3>
            {subtitle && <p className="text-[13px] text-muted-foreground mb-4">{subtitle}</p>}

            <div className="bg-white rounded-2xl p-4 mx-auto w-fit shadow-lg">
              <QRCodeSVG
                value={url}
                size={200}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#1a1a2e"
                style={{ borderRadius: 8 }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 mb-4 truncate px-4">{url}</p>

            <button
              onClick={handleShare}
              className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <Share2 className="w-4 h-4" />
              Compartir enlace
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRCodeModal;
