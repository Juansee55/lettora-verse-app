export interface WallpaperPreset {
  id: string;
  name: string;
  css: string;
  preview: string;
}

// Chat background presets. `css` applies as `style.background`, `preview` is a small swatch.
export const CHAT_WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "default",
    name: "Predeterminado",
    css: "hsl(var(--background))",
    preview: "hsl(var(--background))",
  },
  {
    id: "aurora",
    name: "Aurora",
    css: "radial-gradient(at 20% 0%, hsl(270 80% 25% / 0.35), transparent 55%), radial-gradient(at 90% 100%, hsl(200 90% 40% / 0.30), transparent 55%), hsl(var(--background))",
    preview: "linear-gradient(135deg, hsl(270 80% 40%), hsl(200 90% 50%))",
  },
  {
    id: "sunset",
    name: "Atardecer",
    css: "linear-gradient(160deg, hsl(20 90% 60% / 0.28), hsl(320 80% 55% / 0.22) 55%, hsl(var(--background)) 100%)",
    preview: "linear-gradient(160deg, hsl(20 90% 60%), hsl(320 80% 55%))",
  },
  {
    id: "mint",
    name: "Menta",
    css: "linear-gradient(160deg, hsl(160 70% 55% / 0.22), hsl(190 80% 60% / 0.18) 60%, hsl(var(--background)) 100%)",
    preview: "linear-gradient(160deg, hsl(160 70% 55%), hsl(190 80% 60%))",
  },
  {
    id: "midnight",
    name: "Medianoche",
    css: "radial-gradient(at 50% 0%, hsl(240 50% 30% / 0.55), transparent 60%), hsl(240 30% 8%)",
    preview: "radial-gradient(at 50% 0%, hsl(240 60% 40%), hsl(240 30% 8%))",
  },
  {
    id: "bubbles",
    name: "Burbujas",
    css: "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.18) 0 6%, transparent 7%), radial-gradient(circle at 70% 70%, hsl(var(--primary) / 0.14) 0 4%, transparent 5%), radial-gradient(circle at 40% 80%, hsl(var(--primary) / 0.12) 0 5%, transparent 6%), hsl(var(--background))",
    preview: "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.5) 0 30%, transparent 35%), hsl(var(--background))",
  },
  {
    id: "paper",
    name: "Papel",
    css: "repeating-linear-gradient(0deg, hsl(var(--muted) / 0.35) 0 1px, transparent 1px 28px), hsl(var(--background))",
    preview: "repeating-linear-gradient(0deg, hsl(var(--muted)) 0 2px, hsl(var(--background)) 2px 8px)",
  },
  {
    id: "grid",
    name: "Cuadrícula",
    css: "linear-gradient(hsl(var(--muted) / 0.25) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, hsl(var(--muted) / 0.25) 1px, transparent 1px) 0 0 / 22px 22px, hsl(var(--background))",
    preview: "linear-gradient(hsl(var(--muted)) 1px, transparent 1px) 0 0 / 6px 6px, linear-gradient(90deg, hsl(var(--muted)) 1px, transparent 1px) 0 0 / 6px 6px, hsl(var(--background))",
  },
];

export const REACTION_EMOJIS = ["❤️", "👍", "👎", "😂", "‼️", "❓"];

export function resolveWallpaperBackground(value: string | null | undefined): string {
  if (!value) return "hsl(var(--background))";
  if (value.startsWith("preset:")) {
    const id = value.slice(7);
    const preset = CHAT_WALLPAPER_PRESETS.find((p) => p.id === id);
    return preset?.css ?? "hsl(var(--background))";
  }
  if (value.startsWith("http") || value.startsWith("blob:") || value.startsWith("data:")) {
    return `center / cover no-repeat url("${value}"), hsl(var(--background))`;
  }
  return "hsl(var(--background))";
}