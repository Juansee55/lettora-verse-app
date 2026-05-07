import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "lettora_known_version";
const DISMISS_KEY = "lettora_version_banner_dismissed";

const VersionUpdateBanner = () => {
  const [version, setVersion] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("app_versions")
        .select("version, release_notes")
        .eq("is_current", true)
        .maybeSingle();
      if (!mounted || !data) return;
      const known = localStorage.getItem(STORAGE_KEY);
      const dismissed = localStorage.getItem(DISMISS_KEY);
      setVersion(data.version);
      setNotes(data.release_notes || "");
      if (known !== data.version && dismissed !== data.version) {
        setVisible(true);
      }
      // Set as known only when user actively updates/dismisses
    })();
    return () => { mounted = false; };
  }, []);

  const dismiss = () => {
    if (version) localStorage.setItem(DISMISS_KEY, version);
    setVisible(false);
  };

  const update = () => {
    if (version) {
      localStorage.setItem(STORAGE_KEY, version);
      localStorage.setItem(DISMISS_KEY, version);
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) =>
        Promise.all(regs.map((r) => r.update()))
      ).finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {visible && version && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="sticky top-0 z-[60] px-3 pt-2"
        >
          <div className="mx-auto max-w-2xl bg-card/80 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-glow px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                Lettora {version} disponible
              </p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {notes || "Te recomendamos actualizar."}
              </p>
            </div>
            <button
              onClick={update}
              className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Download className="w-3.5 h-3.5" />
              Actualizar
            </button>
            <button
              onClick={dismiss}
              aria-label="Cerrar"
              className="w-7 h-7 rounded-full hover:bg-muted/60 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VersionUpdateBanner;