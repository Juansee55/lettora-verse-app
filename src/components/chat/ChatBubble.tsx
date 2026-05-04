import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";

interface ChatBubbleProps {
  content: string;
  time: string;
  isOwn: boolean;
  mediaUrl?: string | null;
  mediaType?: string;
  senderName?: string | null;
  senderNameColorClass?: string;
  senderAvatarUrl?: string | null;
  showSender?: boolean;
  onLongPress?: () => void;
  onAvatarClick?: () => void;
}

const ChatBubble = ({ content, time, isOwn, mediaUrl, mediaType = "text", senderName, senderNameColorClass, senderAvatarUrl, showSender, onLongPress, onAvatarClick }: ChatBubbleProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isMedia = mediaType === "image" || mediaType === "video";
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => onLongPress?.(), 500);
  }, [onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onLongPress?.();
  }, [onLongPress]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex items-end gap-1.5 ${isOwn ? "justify-end" : "justify-start"} mb-0.5`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      {/* Avatar (only for incoming messages in groups) */}
      {!isOwn && showSender && (
        <button
          onClick={onAvatarClick}
          className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center text-primary-foreground text-[11px] font-semibold mb-0.5"
        >
          {senderAvatarUrl ? (
            <img src={senderAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{(senderName || "?")[0]?.toUpperCase()}</span>
          )}
        </button>
      )}
      <div
        className={`relative max-w-[75%] ${isMedia && !content ? "p-[3px]" : "px-[14px] py-[8px]"} ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-[20px] rounded-br-[6px]"
            : "bg-muted/80 text-foreground rounded-[20px] rounded-bl-[6px]"
        } select-none transition-transform active:scale-[0.98]`}
        style={{
          boxShadow: isOwn
            ? "0 1px 2px hsl(270 50% 20% / 0.15)"
            : "0 1px 2px hsl(270 50% 20% / 0.06)",
        }}
      >
        {showSender && senderName && !isOwn && (
          <p className={`text-[12px] font-semibold mb-1 leading-none ${senderNameColorClass || "text-primary"}`}>{senderName}</p>
        )}

        {mediaUrl && mediaType === "image" && (
          <div className="rounded-[16px] overflow-hidden mb-1.5">
            <img
              src={mediaUrl}
              alt=""
              className={`max-w-full max-h-[280px] object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="w-[200px] h-[140px] bg-muted/30 animate-pulse rounded-[16px]" />
            )}
          </div>
        )}

        {mediaUrl && mediaType === "video" && (
          <div className="rounded-[16px] overflow-hidden mb-1.5">
            <video src={mediaUrl} controls className="max-w-full max-h-[280px] rounded-[16px]" preload="metadata" />
          </div>
        )}

        {content && (
          <p className={`text-[15px] leading-[1.4] whitespace-pre-wrap break-words ${isMedia ? "px-2 pb-0.5 pt-1" : ""}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {content}
          </p>
        )}

        <div className={`flex items-center justify-end gap-1 ${isMedia && !content ? "px-2 pb-1.5" : "mt-[2px]"}`}>
          <span className={`text-[10px] leading-none ${isOwn ? "text-primary-foreground/50" : "text-muted-foreground/70"}`}>
            {time}
          </span>
          {isOwn && <CheckCheck className={`w-3.5 h-3.5 ${isOwn ? "text-primary-foreground/50" : "text-muted-foreground/70"}`} />}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
