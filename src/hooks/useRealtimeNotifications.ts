import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications, NotificationType } from "./usePushNotifications";

/**
 * Hook para escuchar eventos en tiempo real de Supabase y enviar notificaciones push
 */
export const useRealtimeNotifications = (userId: string | null) => {
  const { sendPushNotification } = usePushNotifications();

  // Escuchar nuevos mensajes
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel(`messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const message = payload.new as any;
          sendPushNotification(
            userId,
            "message",
            "Nuevo mensaje",
            `${message.sender_name || "Usuario"} te envió un mensaje`,
            { messageId: message.id, conversationId: message.conversation_id }
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, sendPushNotification]);

  // Escuchar nuevos likes
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel(`likes:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
          filter: `liked_by_user_id=eq.${userId}`,
        },
        (payload) => {
          const like = payload.new as any;
          sendPushNotification(
            userId,
            "like",
            "¡Te ha gustado!",
            `${like.liker_name || "Usuario"} le gustó tu contenido`,
            { contentId: like.content_id, likerId: like.liker_id }
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, sendPushNotification]);

  // Escuchar nuevos seguidores
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel(`followers:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "follows",
          filter: `followed_user_id=eq.${userId}`,
        },
        (payload) => {
          const follow = payload.new as any;
          sendPushNotification(
            userId,
            "follower",
            "¡Nuevo seguidor!",
            `${follow.follower_name || "Usuario"} te está siguiendo`,
            { followerId: follow.follower_id }
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, sendPushNotification]);

  // Escuchar nuevas noticias
  useEffect(() => {
    const subscription = supabase
      .channel("news:public")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "news",
        },
        (payload) => {
          const news = payload.new as any;
          if (userId) {
            sendPushNotification(
              userId,
              "news",
              "Noticia destacada",
              news.title || "Se publicó una nueva noticia",
              { newsId: news.id }
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, sendPushNotification]);

  return {
    isListening: !!userId,
  };
};
