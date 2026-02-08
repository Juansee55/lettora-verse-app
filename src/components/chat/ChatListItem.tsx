import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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
  id,
  name,
  avatar,
  isGroup,
  lastMessage,
  lastMessageTime,
  unreadCount,
  index,
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
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Ayer";
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const isUrl = avatar.startsWith("http");

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={() => navigate(`/chat/${id}`)}
      className="flex items-center gap-3 w-full px-4 py-3 active:bg-muted/60 transition-colors"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-base font-semibold overflow-hidden ${
            isGroup
              ? "bg-secondary text-secondary-foreground text-xl"
              : "bg-gradient-hero text-primary-foreground"
          }`}
        >
          {isUrl ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            avatar
          )}
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-primary rounded-full text-[11px] text-primary-foreground flex items-center justify-center font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={`text-[15px] truncate ${unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
            {name}
          </h3>
          <span className={`text-xs flex-shrink-0 ${unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
            {formatTime(lastMessageTime)}
          </span>
        </div>
        <p className={`text-[13px] truncate mt-0.5 ${unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {lastMessage || "No hay mensajes aún"}
        </p>
      </div>
    </motion.button>
  );
};

export default ChatListItem;
