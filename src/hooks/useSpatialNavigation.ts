import { useEffect } from "react";

/**
 * Navegación espacial para Smart TV usando el D-pad del mando
 * (flechas, Enter, Back). No requiere ratón ni botones en pantalla.
 *
 * Cualquier elemento con [data-tv-focusable] participa.
 * Enter activa el foco actual (click).
 * Back / Escape ejecuta history.back().
 */
export function useSpatialNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const getFocusables = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("[data-tv-focusable]")
      ).filter((el) => el.offsetParent !== null);

    const focusFirst = () => {
      const list = getFocusables();
      if (list.length && !document.activeElement?.hasAttribute("data-tv-focusable")) {
        list[0].focus();
      }
    };

    const center = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
    };

    const move = (dir: "up" | "down" | "left" | "right") => {
      const list = getFocusables();
      const active = (document.activeElement as HTMLElement) || list[0];
      if (!active) return;
      const a = center(active);

      let best: HTMLElement | null = null;
      let bestScore = Infinity;

      for (const el of list) {
        if (el === active) continue;
        const b = center(el);
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        let primary = 0;
        let secondary = 0;
        if (dir === "right") { primary = dx; secondary = Math.abs(dy); }
        if (dir === "left")  { primary = -dx; secondary = Math.abs(dy); }
        if (dir === "down")  { primary = dy; secondary = Math.abs(dx); }
        if (dir === "up")    { primary = -dy; secondary = Math.abs(dx); }

        if (primary <= 4) continue; // debe estar en la dirección
        const score = primary + secondary * 2;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }

      if (best) {
        best.focus();
        best.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":    e.preventDefault(); move("up"); break;
        case "ArrowDown":  e.preventDefault(); move("down"); break;
        case "ArrowLeft":  e.preventDefault(); move("left"); break;
        case "ArrowRight": e.preventDefault(); move("right"); break;
        case "Enter":
        case " ": {
          const el = document.activeElement as HTMLElement | null;
          if (el?.hasAttribute("data-tv-focusable")) {
            e.preventDefault();
            el.click();
          }
          break;
        }
        case "Backspace":
        case "Escape":
        case "GoBack":
          e.preventDefault();
          window.history.back();
          break;
      }
    };

    const t = setTimeout(focusFirst, 200);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled]);
}