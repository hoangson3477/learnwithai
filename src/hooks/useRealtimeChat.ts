'use client';

import { useEffect, useCallback } from 'react';
import supabase from '@/lib/db/supabase';
import { logger } from '@/lib/logger';

interface RealtimeMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface UseRealtimeChatProps {
  chatId?: string;
  onNewMessage?: (message: RealtimeMessage) => void;
  enabled?: boolean;
}

export function useRealtimeChat({ 
  chatId, 
  onNewMessage, 
  enabled = false 
}: UseRealtimeChatProps) {
  
  const subscribeToChat = useCallback(() => {
    if (!chatId || !enabled) return null;

    logger.info('Subscribing to realtime chat:', chatId);

    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          logger.info('New message received:', payload);
          const newMessage = payload.new as RealtimeMessage;
          onNewMessage?.(newMessage);
        }
      )
      .subscribe((status) => {
        logger.info('Realtime subscription status:', status);
      });

    return subscription;
  }, [chatId, onNewMessage, enabled]);

  useEffect(() => {
    const subscription = subscribeToChat();

    return () => {
      if (subscription) {
        logger.info('Unsubscribing from chat:', chatId);
        supabase.removeChannel(subscription);
      }
    };
  }, [subscribeToChat, chatId]);

  return {
    isSubscribed: enabled && !!chatId,
  };
}

export default useRealtimeChat;
