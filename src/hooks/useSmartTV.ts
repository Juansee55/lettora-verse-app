import { useEffect, useState } from "react";

/**
 * Detecta si el usuario entra desde un Smart TV.
 * Cubre los principales fabricantes: Samsung (Tizen), LG (WebOS),
 * Android TV, Google TV, Apple TV, Fire TV, Hisense (Vidaa),
 * Panasonic, Sony BRAVIA, Roku y resoluciones típicas de TV.
 */
export function detectSmartTV(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();

  const tvKeywords = [
    "smart-tv", "smarttv", "smart tv",
    "tizen", "web0s", "webos",
    "googletv", "google tv", "android tv", "androidtv",
    "appletv", "apple tv",
    "hbbtv", "netcast", "viera", "bravia",
    "philipstv", "nettv",
    "vidaa", "hisense",
    "roku",
    "crkey", // Chromecast
    "aftb", "afts", "aftm", "aftt", "firetv", "fire tv", // Fire TV
    "playstation", "xbox", // consolas con navegador en TV
  ];

  if (tvKeywords.some((k) => ua.includes(k))) return true;

  // Heurística adicional: pantalla muy grande sin touch.
  if (typeof window !== "undefined") {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const noTouch =
      !("ontouchstart" in window) &&
      (navigator.maxTouchPoints ?? 0) === 0;
    if (noTouch && w >= 1280 && h >= 720 && w / h > 1.6) {
      // posible TV/monitor grande sin touch
      // requiere también que el UA no sea Windows/Mac de escritorio
      const isDesktop = /windows nt|macintosh|x11|linux x86/.test(ua);
      if (!isDesktop) return true;
    }
  }
  return false;
}

export function useSmartTV() {
  const [isTV, setIsTV] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem("lettora_force_tv") === "1") return true;
    if (localStorage.getItem("lettora_force_tv") === "0") return false;
    return detectSmartTV();
  });

  useEffect(() => {
    const onResize = () => setIsTV(detectSmartTV() || localStorage.getItem("lettora_force_tv") === "1");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isTV;
}