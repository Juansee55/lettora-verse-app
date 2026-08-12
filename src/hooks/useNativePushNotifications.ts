import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHANNEL_ID = "lettora_notifications";
// FCM is opt-in at build time so APKs without google-services.json never crash on launch.
const ENABLE_NATIVE_PUSH = import.meta.env.VITE_ENABLE_NATIVE_PUSH === "true";

/** Registers native Android FCM notifications for the authenticated user. */
export const useNativePushNotifications = (userId: string | null) => {
  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform() || !ENABLE_NATIVE_PUSH) return;

    let cancelled = false;
    const listeners: Array<{ remove: () => Promise<void> }> = [];

    const register = async () => {
      try {
        const permission = await PushNotifications.checkPermissions();
        const result = permission.receive === "prompt"
          ? await PushNotifications.requestPermissions()
          : permission;

        if (result.receive !== "granted") {
          return;
        }

        await PushNotifications.createChannel({
          id: CHANNEL_ID,
          name: "Notificaciones de Lettora",
          description: "Likes, mensajes, comentarios, publicaciones y anuncios",
          importance: 5,
          visibility: 1,
          sound: "default",
          vibration: true,
        });

        listeners.push(
          await PushNotifications.addListener("registration", async (token: Token) => {
            if (cancelled) return;
            const { error } = await supabase.from("device_push_tokens").upsert(
              {
                user_id: userId,
                token: token.value,
                platform: "android",
                device_name: "Lettora Android",
                last_seen_at: new Date().toISOString(),
              },
              { onConflict: "user_id,token" },
            );
            if (error) console.error("No se pudo guardar el token FCM", error);
          }),
        );

        listeners.push(
          await PushNotifications.addListener(
            "registrationError",
            (error) => console.error("Error registrando FCM", error),
          ),
        );

        listeners.push(
          await PushNotifications.addListener(
            "pushNotificationReceived",
            (notification: PushNotificationSchema) => {
              toast(notification.title || "Lettora", {
                description: notification.body,
              });
            },
          ),
        );

        listeners.push(
          await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (event: ActionPerformed) => {
              const link = event.notification.data?.link || event.notification.data?.url;
              if (typeof link === "string" && link.startsWith("/")) {
                window.location.assign(link);
              }
            },
          ),
        );

        await PushNotifications.register();
      } catch (error) {
        console.error("Notificaciones nativas no disponibles", error);
      }
    };

    void register();

    return () => {
      cancelled = true;
      for (const listener of listeners) {
        void listener.remove();
      }
    };
  }, [userId]);
};
