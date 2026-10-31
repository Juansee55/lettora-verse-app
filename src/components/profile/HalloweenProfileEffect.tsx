import { motion, useReducedMotion } from "framer-motion";
import { Ghost, Moon, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type HalloweenProfileEffectProps = {
  enabled: boolean;
  onToggle: () => void;
  avatarUrl?: string | null;
  fallback?: string;
  displayName?: string | null;
  existingFrameClassName?: string | null;
};

export default function HalloweenProfileEffect({
  enabled,
  onToggle,
  avatarUrl,
  fallback = "?",
  displayName,
  existingFrameClassName,
}: HalloweenProfileEffectProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="halloween-profile-effect">
      <div className={`halloween-avatar-frame ${enabled ? "is-active" : ""}`}>
        {enabled && (
          <>
            <motion.span
              className="halloween-frame-orbit halloween-frame-orbit-one"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              aria-hidden="true"
            >
              <span>✦</span>
            </motion.span>
            <motion.span
              className="halloween-frame-orbit halloween-frame-orbit-two"
              animate={reduceMotion ? undefined : { rotate: -360 }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
              aria-hidden="true"
            >
              <span>✦</span>
            </motion.span>
            <span className="halloween-frame-icon halloween-frame-icon-top" aria-hidden="true"><Moon /></span>
            <span className="halloween-frame-icon halloween-frame-icon-bottom" aria-hidden="true"><Ghost /></span>
          </>
        )}
        <div className={`halloween-avatar-photo ${enabled ? "is-active" : ""} ${existingFrameClassName || ""}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span>{fallback}</span>
          )}
        </div>
      </div>

      <div className="halloween-profile-copy">
        {enabled && (
          <motion.p
            initial={reduceMotion ? undefined : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="halloween-animated-title"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>hechizo de halloween</span>
            <Sparkles className="h-3.5 w-3.5" />
          </motion.p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={`halloween-frame-toggle ${enabled ? "is-active" : ""}`}
          aria-pressed={enabled}
        >
          <WandSparkles className="h-4 w-4" />
          {enabled ? "marco activo" : "activar marco de halloween"}
        </Button>
        {enabled && displayName && (
          <motion.span
            className="halloween-profile-caption"
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {displayName} · spooky storyteller
          </motion.span>
        )}
      </div>
    </div>
  );
}
