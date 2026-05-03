import { motion } from "framer-motion";
import lettoraLogo from "@/assets/lettora-logo.png";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-950 via-violet-900 to-purple-900 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Subtle background glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[100px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[80px] translate-y-20"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="relative"
        >
          <motion.div
            className="absolute inset-0 w-24 h-24 rounded-[28px] border border-white/20"
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-[28px] flex items-center justify-center border border-white/25 shadow-2xl"
            animate={{
              boxShadow: [
                "0 0 40px rgba(139, 92, 246, 0.3)",
                "0 0 80px rgba(139, 92, 246, 0.5)",
                "0 0 40px rgba(139, 92, 246, 0.3)",
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
              <img src={lettoraLogo} alt="Lettora" className="w-16 h-16 object-contain" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* App name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-display font-bold text-white mt-8 tracking-tight"
        >
          Lettora
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-white/50 mt-2 text-sm"
        >
          Donde las historias cobran vida
        </motion.p>

        {/* Minimal loading dots */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-10 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-white rounded-full"
              animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </motion.div>

        {/* Slim progress bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 180 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="h-[3px] bg-white/10 rounded-full mt-5 overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-violet-400 to-pink-400 rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Branding footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-10 flex flex-col items-center gap-1"
      >
        <span className="text-white/25 text-[11px] tracking-widest uppercase">Made by</span>
        <span className="text-white/40 text-[13px] font-semibold tracking-wide">Lettora.Dev / PerriStudios</span>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
