import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, MessageCircle, Twitter, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareAppButtonProps {
  variant?: "icon" | "full";
  className?: string;
}

const APP_URL = "https://lettora-verse-app.lovable.app";
const APP_TITLE = "Lettora — Lee y escribe historias";
const APP_TEXT = "Descubre Lettora, la red social literaria para escritores y lectores.";

export const ShareAppButton = ({ variant = "icon", className = "" }: ShareAppButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tryNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: APP_TITLE, text: APP_TEXT, url: APP_URL });
        return true;
      } catch { /* cancelled */ }
    }
    return false;
  };

  const handleClick = async () => {
    const ok = await tryNativeShare();
    if (!ok) setOpen(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(APP_URL);
    setCopied(true);
    toast({ title: "Enlace copiado" });
    setTimeout(() => setCopied(false), 1800);
  };

  const openExternal = (url: string) => window.open(url, "_blank");

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={handleClick}
          className={`w-10 h-10 rounded-full liquid-glass flex items-center justify-center active:scale-90 transition-transform ${className}`}
          aria-label="Compartir app"
        >
          <Share2 className="w-[18px] h-[18px] text-primary" />
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 px-4 h-11 rounded-2xl bg-gradient-to-r from-primary to-violet-500 text-white font-semibold text-[14px] active:scale-[0.97] transition-transform shadow-lg ${className}`}
        >
          <Share2 className="w-4 h-4" />
          Compartir Lettora
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="w-full max-w-md liquid-glass rounded-t-[28px] p-5 pb-8 border-t border-white/15"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold">Compartir Lettora</h3>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-muted/40 rounded-2xl p-3 mb-4 flex items-center gap-2">
                <p className="flex-1 text-[12px] text-muted-foreground truncate">{APP_URL}</p>
                <button onClick={handleCopy} className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center active:opacity-60">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "WhatsApp", icon: MessageCircle, color: "bg-green-500", url: `https://wa.me/?text=${encodeURIComponent(APP_TEXT + " " + APP_URL)}` },
                  { label: "Twitter", icon: Twitter, color: "bg-sky-500", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(APP_TEXT)}&url=${encodeURIComponent(APP_URL)}` },
                  { label: "Email", icon: Mail, color: "bg-orange-500", url: `mailto:?subject=${encodeURIComponent(APP_TITLE)}&body=${encodeURIComponent(APP_TEXT + "\n\n" + APP_URL)}` },
                  { label: "Copiar", icon: copied ? Check : Copy, color: "bg-violet-500", action: handleCopy },
                ].map(({ label, icon: Icon, color, url, action }) => (
                  <button
                    key={label}
                    onClick={() => action ? action() : openExternal(url!)}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-md`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[11px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
