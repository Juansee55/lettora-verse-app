import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showLocalNotification, setupLocalNotificationActions } from "@/lib/localNotifications";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  data?: Record<string, unknown> | null;
}

type NotificationCategory = "chat" | "social" | "announcements";
type NotificationPreferences = Record<NotificationCategory, boolean>;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  chat: true,
  social: true,
  announcements: true,
};

const categoryFor = (type: string): NotificationCategory => {
  if (["message", "chat", "chat_message"].includes(type)) return "chat";
  if (["like", "comment", "follow", "mention", "chapter_like", "new_reader"].includes(type)) return "social";
  return "announcements";
};

/**
 * Shows a local device/browser alert when a notification row is created for
 * the signed-in user. Remote delivery remains owned by send-push and the PWA
 * service worker, so a web push subscription will not receive a duplicate.
 */
export const useRealtimeNotifications = (userId: string | null) => {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const preferencesRef = useRef<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    if (!userId) return;
    seenIdsRef.current.clear();
    preferencesRef.current = DEFAULT_PREFERENCES;
    let mounted = true;
    let actionListener: { remove: () => Promise<void> } | undefined;

    const loadPreferences = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("push_preferences")
        .eq("id", userId)
        .maybeSingle();
      if (!mounted) return;
      const saved = data?.push_preferences;
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        preferencesRef.current = {
          ...DEFAULT_PREFERENCES,
          ...(saved as Partial<NotificationPreferences>),
        };
      }
    };

    void loadPreferences();
    void setupLocalNotificationActions()
      .then((listener) => { actionListener = listener; })
      .catch((error) => console.error("[LocalNotifications] No se pudieron preparar las acciones:", error));

    const channel = supabase
      .channel(`local-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mounted) return;
          const notification = payload.new as NotificationRow;
          if (!notification.id || seenIdsRef.current.has(notification.id)) return;
          seenIdsRef.current.add(notification.id);

          const senderId = notification.data?.senderId;
          if (senderId === userId) return;
          if (preferencesRef.current[categoryFor(notification.type)] === false) return;

          void showLocalNotification({
            id: notification.id,
            title: notification.title || "Lettora",
            body: notification.message || "Tienes una nueva notificación",
            link: notification.link,
            tag: notification.type || notification.id,
            type: notification.type,
          }).catch((error) => console.error("[LocalNotifications] No se pudo mostrar el aviso:", error));
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[Realtime][notifications] No se pudo suscribir:", error ?? status);
        }
      });

    return () => {
      mounted = false;
      void actionListener?.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { isListening: Boolean(userId) };
};
