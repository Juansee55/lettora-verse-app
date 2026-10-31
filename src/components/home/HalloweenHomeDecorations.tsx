import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Ghost, Moon, Sparkles, Skull } from "lucide-react";

type HalloweenHomeDecorationsProps = {
  onChannel: () => void;
  onExplore: () => void;
};

export default function HalloweenHomeDecorations({ onChannel, onExplore }: HalloweenHomeDecorationsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="halloween-home-hero" aria-label="Especial de Halloween en Lettora">
      <div className="halloween-home-glow halloween-home-glow-one" aria-hidden="true" />
      <div className="halloween-home-glow halloween-home-glow-two" aria-hidden="true" />
      <motion.span
        className="halloween-home-bat halloween-home-bat-one"
        animate={reduceMotion ? undefined : { x: [0, 18, -4, 0], y: [0, -10, 4, 0], rotate: [-8, 4, -4, -8] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >🦇</motion.span>
      <motion.span
        className="halloween-home-bat halloween-home-bat-two"
        animate={reduceMotion ? undefined : { x: [0, -16, 2, 0], y: [0, 8, -5, 0], rotate: [8, -4, 5, 8] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: .4 }}
        aria-hidden="true"
      >🦇</motion.span>

      <div className="relative z-10 flex items-center gap-4">
        <div className="halloween-home-icon-stack" aria-hidden="true">
          <motion.div
            className="halloween-home-ghost"
            animate={reduceMotion ? undefined : { y: [0, -7, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Ghost />
          </motion.div>
          <span className="halloween-home-moon"><Moon /></span>
          <span className="halloween-home-skull"><Skull /></span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="halloween-home-kicker"><Sparkles /> noche de historias <Sparkles /></div>
          <h2 className="halloween-home-title">la magia vive en cada página</h2>
          <p className="halloween-home-copy">entra al canal, descubre las noticias del staff y celebra con la comunidad.</p>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap gap-2.5">
        <motion.button
          type="button"
          onClick={onChannel}
          whileHover={reduceMotion ? undefined : { y: -2, scale: 1.02 }}
          whileTap={{ scale: .97 }}
          className="halloween-home-action halloween-home-action-primary group"
        >
          <span className="halloween-action-bat halloween-action-bat-left" aria-hidden="true">🦇</span>
          entrar al canal
          <ArrowUpRight />
          <span className="halloween-action-bat halloween-action-bat-right" aria-hidden="true">🦇</span>
        </motion.button>
        <motion.button
          type="button"
          onClick={onExplore}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={{ scale: .97 }}
          className="halloween-home-action halloween-home-action-ghost group"
        >
          <span className="halloween-action-bat halloween-action-bat-left" aria-hidden="true">🦇</span>
          explorar historias
          <span className="halloween-action-bat halloween-action-bat-right" aria-hidden="true">🦇</span>
        </motion.button>
      </div>
    </section>
  );
}
