import { useState, useCallback, useRef, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type TypingPayload = {
  user_id?: unknown;
  typing?: unknown;
  enabled?: unknown;
};

const isTypingPayload = (value: unknown): value is TypingPayload => (
  typeof value === 'object' && value !== null
);

/**
 * Broadcast-based typing indicator.
 * Uses one channel per conversation and only sends events after the channel
 * has reached SUBSCRIBED, avoiding noisy "send before subscribe" console errors.
 */
export const useTypingIndicator = (conversationId: string, userId: string | null, enabled = true) => {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelStatusRef = useRef<string>('CLOSED');
  const enabledRef = useRef(enabled);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sendTypingEvent = useCallback(async (payload: { user_id: string; typing: boolean; enabled: boolean }) => {
    const channel = channelRef.current;
    if (!channel || channelStatusRef.current !== 'SUBSCRIBED') return;

    try {
      const result = await channel.send({ type: 'broadcast', event: 'typing', payload });
      if (result !== 'ok') {
        console.warn('[Realtime][typing] Evento no confirmado:', result);
      }
    } catch (error) {
      console.error('[Realtime][typing] Error enviando evento:', error);
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) return;

    let mounted = true;
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (!mounted || !isTypingPayload(payload)) return;

      const from = typeof payload.user_id === 'string' ? payload.user_id : undefined;
      const isTypingNow = typeof payload.typing === 'boolean' ? payload.typing : undefined;
      const senderEnabled = payload.enabled !== false;
      if (!from || from === userId || typeof isTypingNow !== 'boolean') return;
      if (isTypingNow && !senderEnabled) return;

      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTypingNow) next.add(from);
        else next.delete(from);
        return next;
      });

      if (isTypingNow) {
        if (clearTimersRef.current[from]) clearTimeout(clearTimersRef.current[from]);
        clearTimersRef.current[from] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(from);
            return next;
          });
          delete clearTimersRef.current[from];
        }, 3500);
      } else if (clearTimersRef.current[from]) {
        clearTimeout(clearTimersRef.current[from]);
        delete clearTimersRef.current[from];
      }
    });

    channelRef.current = channel;
    channelStatusRef.current = 'JOINING';
    channel.subscribe((status, error) => {
      channelStatusRef.current = status;
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[Realtime][typing] No se pudo suscribir al canal:', error ?? status);
      }
    });

    return () => {
      mounted = false;
      Object.values(clearTimersRef.current).forEach(clearTimeout);
      clearTimersRef.current = {};
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
      void sendTypingEvent({ user_id: userId, typing: false, enabled: false });
      channelStatusRef.current = 'CLOSED';
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [conversationId, userId, sendTypingEvent]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) {
      setTypingUsers(new Set());
      setIsTyping(false);
      if (userId) void sendTypingEvent({ user_id: userId, typing: false, enabled: false });
    }
  }, [enabled, userId, sendTypingEvent]);

  useEffect(() => {
    setIsTyping(typingUsers.size > 0);
  }, [typingUsers]);

  const notifyTyping = useCallback(() => {
    if (!userId || !enabledRef.current) return;
    void sendTypingEvent({ user_id: userId, typing: true, enabled: true });

    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = setTimeout(() => {
      void sendTypingEvent({ user_id: userId, typing: false, enabled: true });
    }, 2500);
  }, [userId, sendTypingEvent]);

  return { isTyping, typingUsers, notifyTyping };
};
