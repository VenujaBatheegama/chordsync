import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { SessionState } from '../lib/types';
import { getUserId, getUsername } from '../lib/user';
import { api } from '../lib/api';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useSocket(shareCode: string, playlistId: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const userId = getUserId();
  const userName = getUsername() || 'Anonymous';

  useEffect(() => {
    // 1. Fetch initial state
    api.getSession(shareCode).then(({ state }) => {
      setSessionState(state);
    });

    // 2. Setup Realtime Channel
    const channel = supabase.channel(`session:${shareCode}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'state_update' }, ({ payload }) => {
        setSessionState((prev) => prev ? { ...prev, ...payload.patch } : prev);
      })
      .on('broadcast', { event: 'leader_change' }, ({ payload }) => {
        setSessionState((prev) =>
          prev ? { ...prev, leaderUserId: payload.leaderUserId, leaderUserName: payload.leaderUserName } : prev
        );
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Session', filter: `shareCode=eq.${shareCode}` }, (payload) => {
        setSessionState(payload.new as SessionState);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareCode, playlistId]);

  const pushStateUpdate = useCallback(
    (patch: Partial<Pick<SessionState, 'currentItemId' | 'scrollPercent' | 'transposeOffset'>>) => {
      // Optimistic update
      setSessionState((prev) => prev ? { ...prev, ...patch } : prev);
      
      // Broadcast instantly to peers
      channelRef.current?.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { patch },
      });

      // Persist to DB (fire and forget)
      supabase.from('Session').update(patch).eq('shareCode', shareCode).then();
    },
    [shareCode]
  );

  const claimLeader = useCallback(() => {
    const patch = { leaderUserId: userId, leaderUserName: userName };
    setSessionState((prev) => prev ? { ...prev, ...patch } : prev);
    
    channelRef.current?.send({
      type: 'broadcast',
      event: 'leader_change',
      payload: patch,
    });

    supabase.from('Session').update(patch).eq('shareCode', shareCode).then();
  }, [shareCode, userId, userName]);

  return {
    sessionState,
    isConnected,
    pushStateUpdate,
    claimLeader,
    leaderUserName: sessionState?.leaderUserName ?? null,
    leaderUserId: sessionState?.leaderUserId ?? null,
  };
}
