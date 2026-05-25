import { motion } from "framer-motion";
import { ChevronLeft, MoreHorizontal, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedChatHeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  isTyping?: boolean;
  onBack: () => void;
  onMore: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
}

const EnhancedChatHeader = ({
  title,
  subtitle,
  avatarUrl,
  isOnline = false,
  isTyping = false,
  onBack,
  onMore,
  onCall,
  onVideoCall,
}: EnhancedChatHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 border-b border-border/30 bg-background/80 backdrop-blur-2xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Back button + Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 flex-shrink-0"
            onClick={onBack}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Avatar + Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-white font-semibold overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{title[0]?.toUpperCase() || "?"}</span>
                )}
              </div>

              {/* Online indicator */}
              {isOnline && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background"
                />
              )}
            </div>

            {/* Text info */}
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold truncate">{title}</h2>
              <motion.p
                animate={{ opacity: isTyping ? [0.5, 1, 0.5] : 1 }}
                transition={{ duration: 1.5, repeat: isTyping ? Infinity : 0 }}
                className="text-[12px] text-muted-foreground truncate"
              >
                {isTyping ? "escribiendo..." : subtitle || (isOnline ? "En línea" : "Desconectado")}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onCall && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={onCall}
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}

          {onVideoCall && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={onVideoCall}
            >
              <Video className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={onMore}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default EnhancedChatHeader;
