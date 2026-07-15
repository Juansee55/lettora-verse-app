import { motion, AnimatePresence } from "framer-motion";

export interface ReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

interface Props {
  reactions: ReactionSummary[];
  isOwn: boolean;
  onToggle: (emoji: string) => void;
}

const ReactionsBar = ({ reactions, isOwn, onToggle }: Props) => {
  if (!reactions.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 -mt-1 mb-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      <AnimatePresence initial={false}>
        {reactions.map((r) => (
          <motion.button
            key={r.emoji}
            initial={{ scale: 0, y: -4 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => onToggle(r.emoji)}
            className={`flex items-center gap-1 px-2 py-[3px] rounded-full text-[13px] leading-none backdrop-blur-md border transition-colors ${
              r.mine
                ? "bg-primary/25 border-primary/50 text-foreground"
                : "bg-background/70 border-border/40 text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <motion.span
              key={r.count}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 15 }}
            >
              {r.emoji}
            </motion.span>
            {r.count > 1 && <span className="text-[11px] font-semibold">{r.count}</span>}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ReactionsBar;