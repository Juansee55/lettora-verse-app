import { useEffect, useState, useCallback } from "react";

/**
 * Hook para gestionar el modo offline y las restricciones de contenido
 */
export const useOfflineMode = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [offlineData, setOfflineData] = useState<Record<string, any>>({});

  // Detectar cambios de conexión
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Verificar estado inicial
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /**
   * Guardar datos en localStorage para acceso offline
   */
  const cacheOfflineData = useCallback((key: string, data: any) => {
    try {
      const cached = JSON.parse(localStorage.getItem("offline_cache") || "{}");
      cached[key] = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem("offline_cache", JSON.stringify(cached));
      setOfflineData(cached);
    } catch (err) {
      console.error("Error caching offline data:", err);
    }
  }, []);

  /**
   * Recuperar datos cacheados
   */
  const getOfflineData = useCallback((key: string) => {
    try {
      const cached = JSON.parse(localStorage.getItem("offline_cache") || "{}");
      return cached[key]?.data || null;
    } catch (err) {
      console.error("Error retrieving offline data:", err);
      return null;
    }
  }, []);

  /**
   * Verificar si se puede acceder a una funcionalidad específica
   */
  const canAccess = useCallback((feature: "news" | "messages" | "profiles" | "content") => {
    if (!isOffline) return true;

    // En modo offline, solo se pueden ver datos cacheados
    switch (feature) {
      case "news":
      case "content":
      case "profiles":
        return false; // No se pueden cargar datos dinámicos
      case "messages":
        return true; // Se pueden ver mensajes cacheados
      default:
        return false;
    }
  }, [isOffline]);

  return {
    isOffline,
    offlineData,
    cacheOfflineData,
    getOfflineData,
    canAccess,
  };
};
