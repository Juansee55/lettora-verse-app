import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NotificationType = "message" | "like" | "follower" | "news";

interface PushNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag: string;
  data?: Record<string, any>;
}

/**
 * Hook para manejar notificaciones push específicas por tipo de evento
 */
export const usePushNotifications = () => {
  // Registrar listeners para notificaciones push en el Service Worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("message", (event) => {
      const { type, payload } = event.data;

      if (type === "PUSH_NOTIFICATION") {
        handleNotificationEvent(payload);
      }
    });
  }, []);

  const handleNotificationEvent = useCallback((payload: PushNotificationPayload) => {
    switch (payload.type) {
      case "message":
        toast.info(`Nuevo mensaje: ${payload.body}`, {
          description: payload.title,
          duration: 5000,
        });
        break;
      case "like":
        toast.success(`¡Te ha gustado! ${payload.body}`, {
          description: payload.title,
          duration: 4000,
        });
        break;
      case "follower":
        toast.success(`¡Nuevo seguidor! ${payload.body}`, {
          description: payload.title,
          duration: 4000,
        });
        break;
      case "news":
        toast.info(`Noticia: ${payload.body}`, {
          description: payload.title,
          duration: 5000,
        });
        break;
    }
  }, []);

  /**
   * Enviar notificación push al usuario (llamado desde el backend)
   */
  const sendPushNotification = useCallback(
    async (
      userId: string,
      type: NotificationType,
      title: string,
      body: string,
      data?: Record<string, any>
    ) => {
      try {
        const { error } = await (supabase.from as any)("push_notifications").insert({
          user_id: userId,
          type,
          title,
          body,
          data,
          sent_at: new Date().toISOString(),
        });

        if (error) throw error;
      } catch (err) {
        console.error("Error sending push notification:", err);
      }
    },
    []
  );

  return {
    sendPushNotification,
    handleNotificationEvent,
  };
};
