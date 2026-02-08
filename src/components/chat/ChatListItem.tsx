import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

interface ChatListItemProps {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  index: number;
}

const ChatListItem = ({
  id, name, avatar, isGroup, lastMessage, lastMessageTime, unreadCount, index,
}: ChatListItemProps) => {
  const navigate = useNavigate();

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "ahora";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return date.toLocaleDateString("es-ES", { weekday: "short" });
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const isUrl = avatar.startsWith("http");

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => navigate(`/chat/${id}`)}
      className="flex items-center gap-3.5 w-full px-4 py-3 active:bg-muted/40 transition-all duration-150"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-[54px] h-[54px] rounded-full flex items-center justify-center text-base font-semibold overflow-hidden shadow-sm ${
            isGroup
              ? "bg-gradient-to-br from-primary/20 to-primary/40"
              : "bg-gradient-to-br from-primary/70 to-primary"
          }`}
        >
          {isUrl ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : isGroup ? (
            <Users className="w-5 h-5 text-primary" />
          ) : (
            <span className="text-primary-foreground text-lg">{avatar}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 bg-primary rounded-full text-[11px] text-primary-foreground flex items-center justify-center font-bold shadow-sm"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left border-b border-border/30 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`text-[16px] truncate ${unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {name}
          </h3>
          <span className={`text-[13px] flex-shrink-0 ${unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            {formatTime(lastMessageTime)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-[14px] truncate ${unreadCount > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>
            {lastMessage || "No hay mensajes aún"}
          </p>
          {unreadCount > 0 && (
            <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>
      </div>
    </motion.button>
  );
};

export default ChatListItem;
