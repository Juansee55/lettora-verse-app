import { motion, useReducedMotion } from "framer-motion";
import lettoraIcon from "@/assets/lettora-app-icon.png";

interface LettoraMarkProps {
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: "h-10 w-10 rounded-[13px]", image: "h-7 w-7", glow: "-inset-1" },
  md: { box: "h-14 w-14 rounded-[18px]", image: "h-10 w-10", glow: "-inset-2" },
  lg: { box: "h-24 w-24 rounded-[28px]", image: "h-16 w-16", glow: "-inset-3" },
};

const LettoraMark = ({ size = "md", animated = true, showWordmark = false, className = "" }: LettoraMarkProps) => {
  const reduceMotion = useReducedMotion();
  const config = sizes[size];
  const shouldAnimate = animated && !reduceMotion;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <motion.div
        whileTap={shouldAnimate ? { scale: 0.96 } : undefined}
        animate={shouldAnimate ? { y: [0, -3, 0], rotate: [0, 1.5, 0] } : undefined}
        transition={shouldAnimate ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" } : undefined}
        className={`relative isolate ${config.box} flex shrink-0 items-center justify-center bg-gradient-to-br from-violet-600 via-primary to-fuchsia-500 shadow-[0_12px_28px_-10px_hsl(var(--primary)/0.65)]`}
        aria-label="Lettora"
      >
        <span className={`absolute ${config.glow} -z-10 rounded-[inherit] bg-primary/30 blur-xl`} />
        <motion.span
          animate={shouldAnimate ? { opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.08, 0.9] } : undefined}
          transition={shouldAnimate ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" } : undefined}
          className="absolute inset-1 rounded-[inherit] bg-white/10"
        />
        <img src={lettoraIcon} alt="" className={`${config.image} relative object-contain drop-shadow-lg`} />
        {shouldAnimate && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_12px_3px_hsl(var(--primary)/0.65)]"
          />
        )}
      </motion.div>
      {showWordmark && <span className="font-display text-lg font-bold tracking-tight">Lettora</span>}
    </div>
  );
};

export default LettoraMark;
