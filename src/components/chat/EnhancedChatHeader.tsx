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
  const presenceText = isTyping
    ? "escribiendo…"
    : subtitle || (isOnline ? "En línea" : "Conversación privada");

  return (
    <header className="sticky top-0 z-40 border-b border-border/35 bg-background/88 px-3 py-2.5 shadow-[0_10px_32px_hsl(var(--background)/0.18)] backdrop-blur-2xl">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-2xl text-foreground transition-all hover:bg-primary/8 hover:text-primary active:scale-95"
          onClick={onBack}
          aria-label="Volver a conversaciones"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.25]" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[15px] bg-gradient-hero text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{title[0]?.toUpperCase() || "?"}</span>
              )}
            </div>
            {isOnline && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500"
                aria-label="En línea"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-bold leading-tight tracking-tight">{title}</h1>
            <motion.p
              animate={{ opacity: isTyping ? [0.55, 1, 0.55] : 1 }}
              transition={{ duration: 1.2, repeat: isTyping ? Infinity : 0 }}
              className={`mt-0.5 truncate text-[11px] leading-tight ${isTyping ? "font-medium text-primary" : "text-muted-foreground"}`}
            >
              {presenceText}
            </motion.p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {onCall && (
            <Button
              variant="ghost"
              size="icon"
              className="inline-flex h-9 w-9 rounded-2xl text-muted-foreground transition-all hover:bg-primary/8 hover:text-primary active:scale-95"
              onClick={onCall}
              aria-label="Iniciar llamada de voz"
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          {onVideoCall && (
            <Button
              variant="ghost"
              size="icon"
              className="inline-flex h-9 w-9 rounded-2xl text-muted-foreground transition-all hover:bg-primary/8 hover:text-primary active:scale-95"
              onClick={onVideoCall}
              aria-label="Iniciar videollamada"
            >
              <Video className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-2xl bg-muted/35 text-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
            onClick={onMore}
            aria-label="Opciones de conversación"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default EnhancedChatHeader;
