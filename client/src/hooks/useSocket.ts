import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SessionState } from '../lib/types';
import { getUserId, getUsername } from '../lib/user';

interface UseSocketReturn {
  sessionState: SessionState | null;
  isConnected: boolean;
  pushStateUpdate: (patch: Partial<Pick<SessionState, 'currentItemId' | 'scrollPercent' | 'transposeOffset'>>) => void;
  claimLeader: () => void;
  leaderUserName: string | null;
  leaderUserId: string | null;
}

export function useSocket(shareCode: string, playlistId: string): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const userId = getUserId();
  const userName = getUsername() || 'Anonymous';

  useEffect(() => {
    const socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_session', { shareCode, playlistId, userId, userName });
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('session_state', (state: SessionState) => {
      setSessionState(state);
    });

    socket.on('state_update', (state: SessionState) => {
      setSessionState(state);
    });

    socket.on('leader_change', (data: { leaderUserId: string | null; leaderUserName: string | null }) => {
      setSessionState((prev) =>
        prev ? { ...prev, leaderUserId: data.leaderUserId, leaderUserName: data.leaderUserName } : prev
      );
    });

    return () => {
      socket.emit('leave_session', { shareCode, userId });
      socket.disconnect();
    };
  }, [shareCode, playlistId]);

  const pushStateUpdate = useCallback(
    (patch: Partial<Pick<SessionState, 'currentItemId' | 'scrollPercent' | 'transposeOffset'>>) => {
      socketRef.current?.emit('state_update', { shareCode, patch });
    },
    [shareCode]
  );

  const claimLeader = useCallback(() => {
    socketRef.current?.emit('claim_leader', { shareCode, userId, userName });
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
