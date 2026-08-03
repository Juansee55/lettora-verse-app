import { motion } from "framer-motion";

export type LevelRankKey = "reader" | "author" | "creator" | "master";

interface LevelIconProps {
  rank: LevelRankKey | string;
  size?: number;
  locked?: boolean;
  level?: number;
}

const palettes: Record<string, { from: string; to: string; ring: string; glow: string }> = {
  reader:  { from: "#34d399", to: "#0f766e", ring: "#6ee7b7", glow: "#10b98155" },
  author:  { from: "#60a5fa", to: "#1d4ed8", ring: "#93c5fd", glow: "#3b82f655" },
  creator: { from: "#fbbf24", to: "#b45309", ring: "#fde68a", glow: "#f59e0b55" },
  master:  { from: "#c4b5fd", to: "#6d28d9", ring: "#e9d5ff", glow: "#8b5cf666" },
};

const glyphs: Record<string, JSX.Element> = {
  // open book
  reader: (
    <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 11.5c-2-1.4-4.2-2-6.5-2v11c2.3 0 4.5.6 6.5 2 2-1.4 4.2-2 6.5-2v-11c-2.3 0-4.5.6-6.5 2z" />
      <path d="M16 11.5v11" />
    </g>
  ),
  // quill
  author: (
    <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 9.5c-7 .8-11 4.6-12 11l-1.5 1.5" />
      <path d="M11 20.5c5.5-.6 9-3.6 10.5-8.5" />
      <path d="M9 22.5h4" />
    </g>
  ),
  // spark / star burst
  creator: (
    <g fill="#fff">
      <path d="M16 8.5l1.9 4.6 4.6 1.9-4.6 1.9L16 21.5l-1.9-4.6-4.6-1.9 4.6-1.9z" />
      <circle cx="22" cy="21" r="1.4" opacity="0.85" />
      <circle cx="10.5" cy="10.5" r="1" opacity="0.7" />
    </g>
  ),
  // laurel trophy
  master: (
    <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9h8v4a4 4 0 11-8 0z" fill="#fff" fillOpacity="0.9" stroke="none" />
      <path d="M12 10h-2a2.5 2.5 0 002.5 2.5M20 10h2a2.5 2.5 0 01-2.5 2.5" />
      <path d="M16 17v3M13 22h6" />
    </g>
  ),
};

export const LevelIcon = ({ rank, size = 56, locked = false, level }: LevelIconProps) => {
  const key = palettes[rank] ? rank : "reader";
  const p = palettes[key];

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      style={{ filter: locked ? "grayscale(0.95) opacity(0.5)" : `drop-shadow(0 4px 12px ${p.glow})` }}
      aria-label={`Rango ${key}${level ? ` nivel ${level}` : ""}`}
    >
      <defs>
        <linearGradient id={`lvl-${key}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.from} />
          <stop offset="100%" stopColor={p.to} />
        </linearGradient>
        <linearGradient id={`lvl-shine-${key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* hex badge */}
      <path
        d="M16 2.6l11 6.3v14.2L16 29.4 5 23.1V8.9z"
        fill={`url(#lvl-${key})`}
      />
      <path
        d="M16 2.6l11 6.3v14.2L16 29.4 5 23.1V8.9z"
        fill="none"
        stroke={p.ring}
        strokeOpacity="0.6"
        strokeWidth="0.9"
      />
      <path d="M16 5.2l8.8 5v11.6L16 26.8l-8.8-5V10.2z" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.6" />

      {glyphs[key]}

      <path d="M16 2.6l11 6.3-11 6.3L5 8.9z" fill={`url(#lvl-shine-${key})`} />
    </motion.svg>
  );
};

export default LevelIcon;
