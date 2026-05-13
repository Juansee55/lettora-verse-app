import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface OfflineOverlayProps {
  isOffline: boolean;
}

const OfflineOverlay = ({ isOffline }: OfflineOverlayProps) => {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Mostrar overlay después de un pequeño delay para evitar parpadeos
    const timer = setTimeout(() => {
      setShowOverlay(isOffline);
    }, 300);
    return () => clearTimeout(timer);
  }, [isOffline]);

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background rounded-2xl p-8 max-w-sm mx-4 border border-destructive/20 shadow-2xl pointer-events-auto"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-4"
              >
                <WifiOff className="w-12 h-12 text-destructive" />
              </motion.div>

              <h2 className="text-xl font-bold mb-2">Sin conexión</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Estás offline. Puedes navegar por la app, pero no podrás ver contenido dinámico ni acceder a perfiles.
              </p>

              <div className="space-y-2 w-full text-left text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  <span>No se pueden cargar noticias</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  <span>Los mensajes no se sincronizarán</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  <span>Los perfiles no se pueden ver</span>
                </div>
              </div>

              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-6 flex items-center gap-2 text-xs text-primary"
              >
                <Wifi className="w-4 h-4" />
                <span>Esperando conexión...</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineOverlay;
