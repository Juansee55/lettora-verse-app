export interface GlimpseFont {
  id: string;
  label: string;
  family: string;
}

export const GLIMPSE_FONTS: GlimpseFont[] = [
  { id: "sans", label: "Clásica", family: "system-ui, sans-serif" },
  { id: "playfair", label: "Editorial", family: "'Playfair Display', serif" },
  { id: "lobster", label: "Lobster", family: "'Lobster', cursive" },
  { id: "pacifico", label: "Pacifico", family: "'Pacifico', cursive" },
  { id: "bebas", label: "Bebas", family: "'Bebas Neue', sans-serif" },
  { id: "caveat", label: "Caveat", family: "'Caveat', cursive" },
  { id: "dancing", label: "Dancing", family: "'Dancing Script', cursive" },
  { id: "anton", label: "Anton", family: "'Anton', sans-serif" },
  { id: "righteous", label: "Righteous", family: "'Righteous', cursive" },
  { id: "mono", label: "Mono", family: "'Space Mono', monospace" },
  { id: "cinzel", label: "Cinzel", family: "'Cinzel', serif" },
  { id: "abril", label: "Abril", family: "'Abril Fatface', serif" },
  { id: "josefin", label: "Josefin", family: "'Josefin Sans', sans-serif" },
  { id: "comfortaa", label: "Comfortaa", family: "'Comfortaa', cursive" },
  { id: "marker", label: "Marker", family: "'Permanent Marker', cursive" },
  { id: "satisfy", label: "Satisfy", family: "'Satisfy', cursive" },
  { id: "orbitron", label: "Orbitron", family: "'Orbitron', sans-serif" },
];

export const fontFamilyOf = (id: string) =>
  GLIMPSE_FONTS.find((f) => f.id === id)?.family ?? GLIMPSE_FONTS[0].family;

export interface GlimpseFilter {
  id: string;
  label: string;
  /** css filter string builder, i = intensity 0..1 */
  css: (i: number) => string;
}

const mix = (base: number, target: number, i: number) => base + (target - base) * i;

export const GLIMPSE_FILTERS: GlimpseFilter[] = [
  { id: "none", label: "Original", css: () => "none" },
  {
    id: "vintage",
    label: "Vintage",
    css: (i) => `sepia(${mix(0, 0.6, i)}) contrast(${mix(1, 1.15, i)}) saturate(${mix(1, 0.85, i)})`,
  },
  { id: "bw", label: "B/N", css: (i) => `grayscale(${i}) contrast(${mix(1, 1.15, i)})` },
  { id: "warm", label: "Cálido", css: (i) => `sepia(${mix(0, 0.35, i)}) saturate(${mix(1, 1.3, i)}) hue-rotate(${mix(0, -10, i)}deg)` },
  { id: "cool", label: "Frío", css: (i) => `saturate(${mix(1, 1.1, i)}) hue-rotate(${mix(0, 18, i)}deg) brightness(${mix(1, 1.03, i)})` },
  { id: "drama", label: "Dramático", css: (i) => `contrast(${mix(1, 1.6, i)}) saturate(${mix(1, 0.8, i)}) brightness(${mix(1, 0.92, i)})` },
  { id: "cine", label: "Cinemático", css: (i) => `contrast(${mix(1, 1.25, i)}) saturate(${mix(1, 1.15, i)}) hue-rotate(${mix(0, -8, i)}deg) brightness(${mix(1, 0.96, i)})` },
  { id: "bright", label: "Brillo", css: (i) => `brightness(${mix(1, 1.25, i)}) saturate(${mix(1, 1.1, i)})` },
  { id: "hdr", label: "HDR", css: (i) => `contrast(${mix(1, 1.35, i)}) saturate(${mix(1, 1.45, i)}) brightness(${mix(1, 1.05, i)})` },
  { id: "retro", label: "Retro", css: (i) => `sepia(${mix(0, 0.4, i)}) hue-rotate(${mix(0, 320, i)}deg) saturate(${mix(1, 1.4, i)})` },
  { id: "soft", label: "Soft", css: (i) => `blur(${mix(0, 1.2, i)}px) brightness(${mix(1, 1.08, i)}) saturate(${mix(1, 0.92, i)})` },
];

export const filterCss = (id: string | null | undefined, intensity = 1) => {
  const f = GLIMPSE_FILTERS.find((x) => x.id === id);
  return f ? f.css(intensity) : "none";
};

export const GLIMPSE_STICKERS = [
  "📖", "✍️", "📚", "🖋️", "🌙", "☕", "🕯️", "🎭", "🪶", "💫",
  "🔥", "💜", "🌸", "⭐", "🌈", "🎧", "🎬", "📷", "🧠", "💡",
  "🗝️", "🧩", "🌊", "🍂", "❄️", "☀️", "🎯", "🏆", "🚀", "👑",
];

export const EMOJI_SET = [
  "😀","😂","🥰","😍","😎","🤩","😭","😴","🤔","🙌","👏","🙏","👀","💪","🫶","❤️","🧡","💛","💚","💙","💜","🖤","🤍","✨","⚡","🎉","🎊","🥳","🍀","🌻","🌹","🌵","🍕","🍫","🍓","🧋","🐈","🐕","🦋","🐉","🌍","🛸","🎸","🎹","🥁","📝","📌","🔖","🧭","⏳",
];

export interface GlimpseTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  gradient: string;
  duration: number;
}

export const GLIMPSE_MUSIC: GlimpseTrack[] = [
  { id: "t1", title: "Noche de Tinta", artist: "Lettora Sound", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", gradient: "linear-gradient(135deg,#7C3AED,#EC4899)", duration: 372 },
  { id: "t2", title: "Páginas al Viento", artist: "Aurora Lab", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", gradient: "linear-gradient(135deg,#0EA5E9,#7C3AED)", duration: 425 },
  { id: "t3", title: "Café y Prosa", artist: "Nocturno", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", gradient: "linear-gradient(135deg,#F59E0B,#EF4444)", duration: 350 },
  { id: "t4", title: "Verso Eléctrico", artist: "Neón Poeta", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", gradient: "linear-gradient(135deg,#10B981,#0EA5E9)", duration: 300 },
  { id: "t5", title: "Capítulo Final", artist: "Astra", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", gradient: "linear-gradient(135deg,#8B5CF6,#22D3EE)", duration: 306 },
  { id: "t6", title: "Manuscrito", artist: "Isla Papel", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", gradient: "linear-gradient(135deg,#F472B6,#8B5CF6)", duration: 325 },
  { id: "t7", title: "Tinta Azul", artist: "Marea", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", gradient: "linear-gradient(135deg,#1D4ED8,#06B6D4)", duration: 289 },
  { id: "t8", title: "Epílogo", artist: "Lumen", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", gradient: "linear-gradient(135deg,#111827,#7C3AED)", duration: 340 },
];

export type OverlayLayer =
  | {
      kind: "text";
      id: string;
      text: string;
      x: number; // 0..1
      y: number; // 0..1
      font: string;
      color: string;
      size: number; // px at 1080 width reference
      rotation: number;
      opacity: number;
      bold: boolean;
      italic: boolean;
      underline: boolean;
      align: "left" | "center" | "right";
      shadow: boolean;
    }
  | { kind: "sticker"; id: string; emoji: string; x: number; y: number; size: number; rotation: number; opacity: number }
  | { kind: "drawing"; id: string; dataUrl: string };

export interface GlimpseAdjust {
  brightness: number;
  contrast: number;
  saturate: number;
  sharpen: number;
  temperature: number;
  rotate: number;
}

export const DEFAULT_ADJUST: GlimpseAdjust = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  sharpen: 0,
  temperature: 0,
  rotate: 0,
};

export const adjustCss = (a: GlimpseAdjust) =>
  `brightness(${a.brightness}%) contrast(${a.contrast + a.sharpen / 4}%) saturate(${a.saturate}%) sepia(${Math.max(0, a.temperature) / 200}) hue-rotate(${a.temperature < 0 ? Math.abs(a.temperature) / 6 : 0}deg)`;

export const PRIVACY_OPTIONS = [
  { id: "public", label: "Público", description: "Cualquier persona en Lettora" },
  { id: "followers", label: "Solo seguidores", description: "Quienes te siguen" },
  { id: "best_friends", label: "Mejores amigos", description: "Tu lista de mejores amigos" },
  { id: "only_me", label: "Solo yo", description: "Nadie más podrá verlo" },
] as const;

/** Comprime imágenes manteniendo calidad perceptible */
export async function compressImage(file: File, maxDim = 1440, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality)
  );
}

export const timeLeftLabel = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expirado";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const timeAgoLabel = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Ahora";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  return `Hace ${h} h`;
};