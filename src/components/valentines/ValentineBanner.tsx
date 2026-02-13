import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart } from "lucide-react";

const ValentineBanner = () => {
  const [visible, setVisible] = useState(() => {
    return sessionStorage.getItem("valentine-banner-dismissed") !== "true";
  });

  const dismiss = () => {
    sessionStorage.setItem("valentine-banner-dismissed", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="overflow-hidden"
      >
        <div className="valentine-gradient relative px-4 py-3 flex items-center gap-3">
          {/* Decorative hearts */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Heart className="w-5 h-5 text-white fill-white/80" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="text-white text-[14px] font-semibold leading-tight">
              💕 ¡Feliz San Valentín!
            </p>
            <p className="text-white/80 text-[12px] leading-tight mt-0.5">
              La decoración especial estará hasta el 16 de febrero
            </p>
          </div>

          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ValentineBanner;
