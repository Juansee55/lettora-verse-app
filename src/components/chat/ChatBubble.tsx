import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import ReactionsBar, { ReactionSummary } from "./ReactionsBar";

interface ChatBubbleProps {
  content: string;
  time: string;
  isOwn: boolean;
  mediaUrl?: string | null;
  mediaType?: string;
  voiceDuration?: number | null;
  senderName?: string | null;
  senderNameColorClass?: string;
  senderAvatarUrl?: string | null;
  showSender?: boolean;
  onLongPress?: () => void;
  onAvatarClick?: () => void;
  reactions?: ReactionSummary[];
  onToggleReaction?: (emoji: string) => void;
  onDoubleTap?: () => void;
  replyPreview?: { author: string; content: string; onJump?: () => void } | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  readByRecipient?: boolean;
  readReceiptsEnabled?: boolean;
}

const ChatBubble = ({
  content,
  time,
  isOwn,
  mediaUrl,
  mediaType = "text",
  voiceDuration,
  senderName,
  senderNameColorClass,
  senderAvatarUrl,
  showSender,
  onLongPress,
  onAvatarClick,
  reactions = [],
  onToggleReaction,
  onDoubleTap,
  replyPreview,
  isEdited,
  isDeleted,
  readByRecipient = false,
  readReceiptsEnabled = true,
}: ChatBubbleProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isMedia = mediaType === "image" || mediaType === "video";
  const isVoice = mediaType === "voice" && mediaUrl;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => onLongPress?.(), 500);
  }, [onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    onLongPress?.();
  }, [onLongPress]);

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      onDoubleTap?.();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  }, [onDoubleTap]);

  if (isDeleted) {
    return (
      <div className={`mb-1 flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[78%] rounded-2xl border border-border/45 bg-muted/35 px-3.5 py-2 text-[12px] italic text-muted-foreground">
          Mensaje eliminado
        </div>
      </div>
    );
  }

  const bubbleTone = isOwn
    ? "bg-gradient-to-br from-primary to-[hsl(var(--primary)/0.82)] text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/0.17)] rounded-br-md"
    : "border border-border/40 bg-card/90 text-foreground shadow-[0_6px_18px_hsl(var(--foreground)/0.045)] rounded-bl-md";

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.96, y: 7 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={`mb-1.5 flex flex-col ${isOwn ? "items-end" : "items-start"}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      <div className={`flex w-full items-end gap-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
        {!isOwn && showSender && (
          <button
            type="button"
            onClick={onAvatarClick}
            className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-hero text-[11px] font-bold text-primary-foreground transition-transform active:scale-95"
            aria-label={`Ver perfil de ${senderName || "usuario"}`}
          >
            {senderAvatarUrl ? (
              <img src={senderAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{(senderName || "?")[0]?.toUpperCase()}</span>
            )}
          </button>
        )}

        <div
          onClick={handleClick}
          className={`relative max-w-[80%] select-none rounded-[22px] transition-transform active:scale-[0.985] ${isMedia && !content ? "p-[3px]" : "px-[14px] py-[9px]"} ${bubbleTone}`}
        >
          {showSender && senderName && !isOwn && (
            <p className={`mb-1.5 text-[11px] font-bold leading-none ${senderNameColorClass || "text-primary"}`}>{senderName}</p>
          )}

          {replyPreview && (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); replyPreview.onJump?.(); }}
              className={`mb-2 w-full rounded-xl border-l-2 px-2.5 py-1.5 text-left transition-colors ${
                isOwn ? "border-primary-foreground/70 bg-primary-foreground/12" : "border-primary bg-primary/10"
              }`}
            >
              <p className={`truncate text-[10px] font-bold ${isOwn ? "text-primary-foreground" : "text-primary"}`}>{replyPreview.author}</p>
              <p className={`mt-0.5 truncate text-[11px] ${isOwn ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{replyPreview.content || "Adjunto"}</p>
            </button>
          )}

          {mediaUrl && mediaType === "image" && (
            <div className="mb-1.5 overflow-hidden rounded-[18px] bg-black/10">
              <img
                src={mediaUrl}
                alt="Imagen compartida"
                className={`max-h-[300px] max-w-full object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && <div className="h-40 w-52 animate-pulse rounded-[18px] bg-muted/45" />}
            </div>
          )}

          {mediaUrl && mediaType === "video" && (
            <div className="mb-1.5 overflow-hidden rounded-[18px] bg-black/10">
              <video src={mediaUrl} controls className="max-h-[300px] max-w-full rounded-[18px]" preload="metadata" />
            </div>
          )}

          {isVoice && voiceDuration && (
            <div className="mb-1.5">
              <VoiceMessagePlayer
                audioUrl={mediaUrl}
                duration={voiceDuration}
                sender={senderName || "Usuario"}
                timestamp={time}
                isOwn={isOwn}
              />
            </div>
          )}

          {content && (
            <p className={`whitespace-pre-wrap break-words text-[14px] leading-[1.45] ${isMedia ? "px-1 pb-0.5 pt-1" : ""}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {content}
            </p>
          )}

          <div className={`flex items-center justify-end gap-1.5 ${isMedia && !content ? "px-2 pb-1.5" : "mt-1"}`}>
            {isEdited && <span className={`text-[9px] italic ${isOwn ? "text-primary-foreground/58" : "text-muted-foreground/70"}`}>editado</span>}
            <span className={`text-[9px] ${isOwn ? "text-primary-foreground/62" : "text-muted-foreground/75"}`}>{time}</span>
            {isOwn && (
              <CheckCheck
                className={`h-3.5 w-3.5 transition-colors ${readReceiptsEnabled && readByRecipient ? "text-sky-200" : "text-primary-foreground/65"}`}
                aria-label={readReceiptsEnabled && readByRecipient ? "Leído" : "Enviado"}
              />
            )}
          </div>
        </div>
      </div>

      {reactions.length > 0 && onToggleReaction && (
        <div className={`${!isOwn && showSender ? "pl-[34px]" : ""} mt-0.5`}>
          <ReactionsBar reactions={reactions} isOwn={isOwn} onToggle={onToggleReaction} />
        </div>
      )}
    </motion.article>
  );
};

export default ChatBubble;
