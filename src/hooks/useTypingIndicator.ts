import { useState, useCallback, useRef, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Broadcast-based typing indicator.
 * Uses a single channel per conversation; sends `typing` broadcasts and
 * listens for others' typing events with a 3s auto-clear.
 */
export const useTypingIndicator = (conversationId: string, userId: string | null) => {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!conversationId || !userId) return;
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const from = (payload as any)?.user_id as string | undefined;
      const active = (payload as any)?.typing as boolean | undefined;
      if (!from || from === userId) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (active) next.add(from);
        else next.delete(from);
        return next;
      });
      setIsTyping((prev) => (active ? true : prev));
      if (active) {
        if (clearTimersRef.current[from]) clearTimeout(clearTimersRef.current[from]);
        clearTimersRef.current[from] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(from);
            if (next.size === 0) setIsTyping(false);
            return next;
          });
        }, 3500);
      }
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      Object.values(clearTimersRef.current).forEach(clearTimeout);
      clearTimersRef.current = {};
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, userId]);

  useEffect(() => {
    setIsTyping(typingUsers.size > 0);
  }, [typingUsers]);

  const notifyTyping = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !userId) return;
    channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId, typing: true } });
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = setTimeout(() => {
      channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId, typing: false } });
    }, 2500);
  }, [userId]);

  return { isTyping, typingUsers, notifyTyping };
};
