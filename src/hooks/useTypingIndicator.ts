import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTypingIndicator = (conversationId: string, userId: string | null) => {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notificar que el usuario está escribiendo
  const notifyTyping = useCallback(async () => {
    if (!userId || !conversationId) return;

    try {
      // Enviar evento de escritura a través de Realtime
      const channel = supabase.channel(`chat:${conversationId}`);
      
      channel.on('presence', { event: 'sync' }, () => {
        // Sincronizar presencia
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            typing: true,
            timestamp: new Date().toISOString(),
          });

          // Limpiar timeout anterior
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          // Detener escritura después de 3 segundos de inactividad
          typingTimeoutRef.current = setTimeout(async () => {
            await channel.track({
              user_id: userId,
              typing: false,
              timestamp: new Date().toISOString(),
            });
          }, 3000);
        }
      });
    } catch (error) {
      console.error('Error notifying typing:', error);
    }
  }, [conversationId, userId]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    typingUsers,
    notifyTyping,
  };
};
