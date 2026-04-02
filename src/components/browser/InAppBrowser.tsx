import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCw, Share2, ExternalLink, Globe, Lock } from "lucide-react";

interface InAppBrowserProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

const InAppBrowser = ({ isOpen, url, onClose }: InAppBrowserProps) => {
  const [loading, setLoading] = useState(true);
  const isSecure = url.startsWith("https");

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-[70] flex flex-col bg-background"
        >
          {/* Top gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between px-4 h-[52px] relative z-10">
              <button
                onClick={onClose}
                className="text-primary text-[17px] font-medium active:opacity-60 transition-opacity"
              >
                Listo
              </button>

              <div className="flex-1 mx-3">
                <div className="flex items-center gap-1.5 justify-center bg-muted/60 rounded-full px-3 py-1.5">
                  {isSecure ? (
                    <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-[13px] text-muted-foreground truncate max-w-[200px]">
                    {hostname}
                  </span>
                </div>
              </div>

              <button
                onClick={() => window.open(url, "_blank")}
                className="p-2 text-primary active:opacity-60 transition-opacity"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Loading bar */}
          {loading && (
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "80%" }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="h-[2px] bg-gradient-to-r from-primary to-accent"
            />
          )}

          {/* iframe */}
          <div className="flex-1 relative">
            <iframe
              src={url}
              className="w-full h-full border-0"
              onLoad={() => setLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              title="In-app browser"
            />
          </div>

          {/* Bottom toolbar */}
          <div className="liquid-glass border-t border-white/10">
            <div className="flex items-center justify-around px-6 py-3 pb-safe">
              <button className="p-2 text-muted-foreground" disabled>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button className="p-2 text-muted-foreground" disabled>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLoading(true)}
                className="p-2 text-muted-foreground active:text-primary transition-colors"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ url });
                  } else {
                    navigator.clipboard.writeText(url);
                  }
                }}
                className="p-2 text-muted-foreground active:text-primary transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InAppBrowser;
