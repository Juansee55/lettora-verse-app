import { useState, useCallback, ReactNode } from "react";
import InAppBrowser, { BrowserContext } from "./InAppBrowser";

export const BrowserProvider = ({ children }: { children: ReactNode }) => {
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  const openUrl = useCallback((url: string) => {
    // Only open http/https URLs in the browser
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
