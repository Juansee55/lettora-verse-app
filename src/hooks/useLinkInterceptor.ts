import { useEffect } from "react";
import { useBrowser } from "@/components/browser/BrowserProvider";

/**
 * Hook para interceptar todos los enlaces en la aplicación
 * y abrirlos en el navegador personalizado estilo iOS
 */
export const useLinkInterceptor = () => {
  const { openUrl } = useBrowser();

  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest("a");
      
      if (!target) return;

      const href = target.getAttribute("href");
      
      // No interceptar enlaces internos (rutas relativas o que comienzan con /)
      if (!href || href.startsWith("/") || href.startsWith("#")) {
        return;
      }

      // No interceptar enlaces mailto, tel, etc.
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("sms:")) {
        return;
      }

      // Interceptar solo URLs externas
      if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("www.")) {
        event.preventDefault();
        event.stopPropagation();
        openUrl(href);
      }
    };

    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, [openUrl]);
};
