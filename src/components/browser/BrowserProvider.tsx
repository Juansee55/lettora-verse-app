import { useState, useCallback, ReactNode, createContext, useContext } from "react";
import InAppBrowser from "./InAppBrowser";

interface BrowserContextType {
  openUrl: (url: string) => void;
  closeUrl: () => void;
}

const BrowserContext = createContext<BrowserContextType>({ 
  openUrl: () => {}, 
  closeUrl: () => {} 
});

export const useBrowser = () => useContext(BrowserContext);

export const BrowserProvider = ({ children }: { children: ReactNode }) => {
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  const openUrl = useCallback((url: string) => {
    // Validar que sea una URL válida
    try {
      new URL(url);
      setBrowserUrl(url);
    } catch {
      // Si no es una URL válida, intentar con protocolo
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        setBrowserUrl(`https://${url}`);
      } else {
        window.open(url, "_blank");
      }
    }
  }, []);

  const closeUrl = useCallback(() => {
    setBrowserUrl(null);
  }, []);

  return (
    <BrowserContext.Provider value={{ openUrl, closeUrl }}>
      {children}
      <InAppBrowser
        isOpen={!!browserUrl}
        url={browserUrl || ""}
        onClose={() => setBrowserUrl(null)}
      />
    </BrowserContext.Provider>
  );
};
