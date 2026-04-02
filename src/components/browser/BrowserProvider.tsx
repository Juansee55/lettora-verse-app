import { useState, useCallback, ReactNode, createContext, useContext } from "react";
import InAppBrowser from "./InAppBrowser";

interface BrowserContextType {
  openUrl: (url: string) => void;
}

const BrowserContext = createContext<BrowserContextType>({ openUrl: () => {} });
export const useBrowser = () => useContext(BrowserContext);

export const BrowserProvider = ({ children }: { children: ReactNode }) => {
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  const openUrl = useCallback((url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      setBrowserUrl(url);
    } else {
      window.open(url, "_blank");
    }
  }, []);

  return (
    <BrowserContext.Provider value={{ openUrl }}>
      {children}
      <InAppBrowser
        isOpen={!!browserUrl}
        url={browserUrl || ""}
        onClose={() => setBrowserUrl(null)}
      />
    </BrowserContext.Provider>
  );
};
