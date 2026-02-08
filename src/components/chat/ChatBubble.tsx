import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface ChatBubbleProps {
  content: string;
  time: string;
  isOwn: boolean;
}

const ChatBubble = ({ content, time, isOwn }: ChatBubbleProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative max-w-[78%] px-3.5 py-2 ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-[18px] rounded-br-[4px]"
            : "bg-muted text-foreground rounded-[18px] rounded-bl-[4px]"
        }`}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${
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
