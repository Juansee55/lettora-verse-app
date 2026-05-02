import { motion, AnimatePresence } from "framer-motion";
import { Download, WifiOff, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";
import { toast } from "sonner";

export const InstallBanner = () => {
  const { canInstall, isInstalled, promptInstall } = usePWA();
  if (isInstalled || !canInstall) return null;
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="fixed top-2 left-2 right-2 z-50 liquid-glass rounded-2xl px-4 py-3 flex items-center gap-3"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
        <Download className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Instalar Lettora</p>
        <p className="text-xs text-muted-foreground truncate">Acceso rápido desde tu pantalla</p>
      </div>
      <Button size="sm" onClick={promptInstall}>Instalar</Button>
    </motion.div>
  );
};

export const OfflineIndicator = () => {
  const { isOnline } = usePWA();
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <WifiOff className="w-4 h-4" />
          Sin conexión — modo offline
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const NotificationButton = () => {
  const { pushSupported, pushSubscribed, subscribePush, unsubscribePush, notificationPermission } = usePWA();

  if (!pushSupported) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <BellOff className="w-4 h-4" />
        Push no disponible aquí
      </Button>
    );
  }

  const handleClick = async () => {
    if (pushSubscribed) {
      await unsubscribePush();
      toast.success("Notificaciones push desactivadas");
    } else {
      const res = await subscribePush();
      if (res.ok) toast.success("¡Notificaciones push activadas!");
      else if (res.reason === "denied") toast.error("Permiso denegado en el navegador");
      else if (res.reason === "no-auth") toast.error("Inicia sesión primero");
      else toast.error("No se pudo activar");
    }
  };

  return (
    <Button variant={pushSubscribed ? "default" : "outline"} size="sm" onClick={handleClick} className="gap-2">
      {pushSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      {pushSubscribed ? "Push activadas" : "Activar push"}
    </Button>
  );
};