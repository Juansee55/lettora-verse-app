import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Play } from "lucide-react";

interface ChatBubbleProps {
  content: string;
  time: string;
  isOwn: boolean;
  mediaUrl?: string | null;
  mediaType?: string;
  senderName?: string | null;
  showSender?: boolean;
}

const ChatBubble = ({ content, time, isOwn, mediaUrl, mediaType = "text", senderName, showSender }: ChatBubbleProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isMedia = mediaType === "image" || mediaType === "video";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative max-w-[78%] ${isMedia && !content ? "p-1" : "px-3.5 py-2"} ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-[18px] rounded-br-[4px]"
            : "bg-muted text-foreground rounded-[18px] rounded-bl-[4px]"
        }`}
      >
        {showSender && senderName && !isOwn && (
          <p className="text-[11px] font-semibold text-primary mb-0.5">{senderName}</p>
        )}

        {mediaUrl && mediaType === "image" && (
          <div className="rounded-[14px] overflow-hidden mb-1">
            <img
              src={mediaUrl}
              alt=""
              className={`max-w-full max-h-[300px] object-cover transition-opacity ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="w-[200px] h-[150px] bg-muted/30 animate-pulse rounded-[14px]" />
            )}
          </div>
        )}

        {mediaUrl && mediaType === "video" && (
          <div className="rounded-[14px] overflow-hidden mb-1">
            <video
              src={mediaUrl}
              controls
              className="max-w-full max-h-[300px] rounded-[14px]"
              preload="metadata"
            />
          </div>
        )}

        {content && (
          <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${isMedia ? "px-2.5 pb-1 pt-0.5" : ""}`}>
            {content}
          </p>
        )}

        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMedia && !content ? "px-2 pb-1" : ""} ${
          isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
        }`}>
          <span className="text-[10px]">{time}</span>
          {isOwn && <Check className="w-3 h-3" />}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
