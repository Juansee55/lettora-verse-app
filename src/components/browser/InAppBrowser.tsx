import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCw, Share2, ExternalLink, Globe, Lock, X, ChevronDown } from "lucide-react";

interface InAppBrowserProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

const InAppBrowser = ({ isOpen, url, onClose }: InAppBrowserProps) => {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [pullDownProgress, setPullDownProgress] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startYRef = useRef(0);
  const isSecure = url.startsWith("https");

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!iframeRef.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      setPullDownProgress(Math.min(diff / 100, 1));
    }
  };

  const handleTouchEnd = () => {
    if (pullDownProgress > 0.3) {
      onClose();
    }
    setPullDownProgress(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-[70] flex flex-col bg-background"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag indicator */}
          <motion.div
            animate={{ opacity: pullDownProgress > 0 ? 1 : 0 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-50"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>

          {/* Top gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

          {/* Header - Estilo iOS 26 */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between px-4 h-[56px] relative z-10">
              {/* Close button */}
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-primary text-[15px] font-medium active:opacity-60 transition-opacity"
              >
                <X className="w-5 h-5" />
                <span>Cerrar</span>
              </button>

              {/* URL Bar */}
              <div className="flex-1 mx-3">
                <div className="flex items-center gap-2 justify-center bg-muted/60 backdrop-blur-md rounded-full px-3 py-2 border border-white/10">
                  {isSecure ? (
                    <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-[12px] text-muted-foreground truncate max-w-[180px] font-medium">
                    {hostname}
                  </span>
                </div>
              </div>

              {/* Share button */}
              <button
                onClick={() => window.open(url, "_blank")}
                className="p-2.5 text-primary active:opacity-60 transition-opacity rounded-full hover:bg-primary/10"
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
              className="h-[3px] bg-gradient-to-r from-primary to-accent rounded-full"
            />
          )}

          {/* iframe Container */}
          <div 
            className="flex-1 relative overflow-hidden"
            style={{
              transform: `translateY(${pullDownProgress * 20}px)`,
              opacity: 1 - pullDownProgress * 0.1,
            }}
          >
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              onLoad={() => setLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
              title="In-app browser"
            />
          </div>

          {/* Bottom toolbar - iOS 26 Style */}
          <div className="bg-gradient-to-t from-background/95 to-background/80 backdrop-blur-xl border-t border-white/10">
            <div className="flex items-center justify-around px-6 py-4 pb-safe">
              {/* Back button */}
              <button 
                onClick={() => {
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.history.back();
                  }
                }}
                disabled={!canGoBack}
                className={`p-3 rounded-full transition-all ${
                  canGoBack 
                    ? "text-primary active:bg-primary/10 active:scale-90" 
                    : "text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Forward button */}
              <button 
                onClick={() => {
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.history.forward();
                  }
                }}
                disabled={!canGoForward}
                className={`p-3 rounded-full transition-all ${
                  canGoForward 
                    ? "text-primary active:bg-primary/10 active:scale-90" 
                    : "text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Refresh button */}
              <button
                onClick={() => {
                  setLoading(true);
                  if (iframeRef.current) {
                    iframeRef.current.src = url;
                  }
                }}
                className="p-3 text-primary active:bg-primary/10 active:scale-90 transition-all rounded-full"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {/* Share button */}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ 
                      title: hostname,
                      url 
                    });
                  } else {
                    navigator.clipboard.writeText(url);
                  }
                }}
                className="p-3 text-primary active:bg-primary/10 active:scale-90 transition-all rounded-full"
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
