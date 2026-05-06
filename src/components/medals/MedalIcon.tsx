import { motion } from "framer-motion";

interface MedalIconProps {
  rarity: "common" | "rare" | "epic" | "legendary" | string;
  index: number;
  size?: number;
  locked?: boolean;
}

const palettes: Record<string, { from: string; to: string; ribbon: string; glow: string }> = {
  common:    { from: "#94a3b8", to: "#475569", ribbon: "#64748b", glow: "#94a3b855" },
  rare:      { from: "#60a5fa", to: "#1d4ed8", ribbon: "#2563eb", glow: "#3b82f677" },
  epic:      { from: "#c084fc", to: "#7c3aed", ribbon: "#8b5cf6", glow: "#a78bfa88" },
  legendary: { from: "#fde047", to: "#f59e0b", ribbon: "#d97706", glow: "#facc1599" },
};

const glyphs = (i: number, color: string) => {
  const variants = [
    <path key="g" d="M16 7l2.4 5 5.5.8-4 3.9.95 5.5L16 19.6l-4.85 2.6.95-5.5-4-3.9 5.5-.8z" fill={color} />,
    <g key="g"><rect x="9" y="9" width="14" height="14" rx="2" fill={color} /><path d="M16 9v14" stroke="#fff" strokeWidth="0.8" /></g>,
    <path key="g" d="M22 9c-6 1-10 5-11 11l-2 2 1.5 1.5L13 21c6-1 10-5 11-11z" fill={color} />,
    <path key="g" d="M16 8c2 3 5 5 5 9a5 5 0 11-10 0c0-2 1-3 2-4-.5 2 1 3 2 2-1-3 0-5 1-7z" fill={color} />,
    <path key="g" d="M16 8l6 6-6 10-6-10z" fill={color} />,
    <path key="g" d="M9 12l3 3 4-5 4 5 3-3v8H9z" fill={color} />,
    <path key="g" d="M20 9a7 7 0 100 14 6 6 0 010-14z" fill={color} />,
    <g key="g"><path d="M11 9h10v4a5 5 0 11-10 0z" fill={color} /><rect x="13" y="18" width="6" height="2" fill={color} /><rect x="12" y="20" width="8" height="2" rx="1" fill={color} /></g>,
  ];
  return variants[i % variants.length];
};

export const MedalIcon = ({ rarity, index, size = 56, locked = false }: MedalIconProps) => {
  const p = palettes[rarity] || palettes.common;
  const id = `m${index}`;
  const grey = locked;

  return (
    <motion.svg
      width={size} height={size} viewBox="0 0 32 32"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 18 }}
      style={{ filter: grey ? "grayscale(0.9) opacity(0.6)" : `drop-shadow(0 4px 10px ${p.glow})` }}
    >
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.from} />
          <stop offset="100%" stopColor={p.to} />
        </linearGradient>
        <linearGradient id={`shine-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`rim-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="78%" stopColor="transparent" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
      </defs>

      <path d="M11 2l2 8h6l2-8z" fill={p.ribbon} opacity={0.9} />
      <path d="M11 2l1.4 5.5L13 10l-2-8z" fill="#000" opacity="0.18" />
      <path d="M21 2l-1.4 5.5L19 10l2-8z" fill="#fff" opacity="0.18" />

      <circle cx="16" cy="19" r="11" fill={`url(#bg-${id})`} />
      <circle cx="16" cy="19" r="11" fill={`url(#rim-${id})`} />
      <circle cx="16" cy="19" r="9" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.6" />

      <g transform="translate(0,3)">{glyphs(index, "#ffffff")}</g>

      <ellipse cx="13" cy="14.5" rx="6" ry="3" fill={`url(#shine-${id})`} />
    </motion.svg>
  );
};
