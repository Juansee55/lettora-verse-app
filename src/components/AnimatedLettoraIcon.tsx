import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface AnimatedLettoraIconProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const AnimatedLettoraIcon = ({ size = "md", showText = true }: AnimatedLettoraIconProps) => {
  const sizes = {
    sm: { container: "w-8 h-8", icon: "w-4 h-4", text: "text-sm" },
    md: { container: "w-10 h-10", icon: "w-5 h-5", text: "text-lg" },
    lg: { container: "w-14 h-14", icon: "w-7 h-7", text: "text-2xl" },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className={`${s.container} bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow relative overflow-hidden`}
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 2, -2, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
        />
        <BookOpen className={`${s.icon} text-primary-foreground relative z-10`} />
      </motion.div>
      {showText && (
        <motion.span
          className={`${s.text} font-display font-bold text-gradient`}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          Lettora
        </motion.span>
      )}
    </div>
  );
};
