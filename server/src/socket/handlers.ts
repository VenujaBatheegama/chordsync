import type { Server as SocketServer } from 'socket.io';
import { SessionService } from '../services/sessionService.js';
import type { SessionState } from '../types.js';

interface JoinPayload {
  shareCode: string;
  playlistId: string;
  userId: string;
  userName: string;
}

interface StateUpdatePayload {
  shareCode: string;
  patch: Partial<Pick<SessionState, 'currentItemId' | 'scrollPercent' | 'transposeOffset'>>;
}

interface ClaimLeaderPayload {
  shareCode: string;
  userId: string;
  userName: string;
}

export function registerSocketHandlers(io: SocketServer): void {
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Track which sessions this socket is in
    const socketSessions = new Set<string>();
    let socketUserId: string | null = null;

    socket.on('join_session', (payload: JoinPayload) => {
      const { shareCode, playlistId, userId, userName } = payload;
      socketUserId = userId;
      socketSessions.add(shareCode);

      socket.join(shareCode);

      // Get or create session state
      const state = SessionService.getOrCreate(shareCode, playlistId);

      // If no leader, this first joiner becomes leader
      if (!state.leaderUserId) {
        const updated = SessionService.update(shareCode, {
          leaderUserId: userId,
          leaderUserName: userName,
        });
        // Send state to the new socket
        socket.emit('session_state', updated);
        // Broadcast leader change to room
        io.to(shareCode).emit('leader_change', { leaderUserId: userId, leaderUserName: userName });
      } else {
        socket.emit('session_state', state);
      }

      // Notify others a new user joined
      socket.to(shareCode).emit('user_joined', { userId, userName });
      console.log(`[Socket.io] ${userName} joined session ${shareCode}`);
    });

    socket.on('leave_session', (payload: { shareCode: string; userId: string }) => {
      const { shareCode, userId } = payload;
      socket.leave(shareCode);
      socketSessions.delete(shareCode);
      SessionService.clearLeader(shareCode, userId);
      socket.to(shareCode).emit('user_left', { userId });
      io.to(shareCode).emit('leader_change', { leaderUserId: null, leaderUserName: null });
      console.log(`[Socket.io] User ${userId} left session ${shareCode}`);
    });

    socket.on('state_update', (payload: StateUpdatePayload) => {
      const { shareCode, patch } = payload;
      const state = SessionService.get(shareCode);
      if (!state) return;

      // Only the leader can push state updates
      if (state.leaderUserId !== socketUserId) return;

      const updated = SessionService.update(shareCode, patch);
      if (updated) {
        // Broadcast to all in room (including sender for confirmation)
        io.to(shareCode).emit('state_update', updated);
      }
    });

    socket.on('claim_leader', (payload: ClaimLeaderPayload) => {
      const { shareCode, userId, userName } = payload;
      const updated = SessionService.update(shareCode, {
        leaderUserId: userId,
        leaderUserName: userName,
      });
      if (updated) {
        io.to(shareCode).emit('leader_change', { leaderUserId: userId, leaderUserName: userName });
        io.to(shareCode).emit('state_update', updated);
        console.log(`[Socket.io] ${userName} claimed leader in session ${shareCode}`);
      }
    });

    socket.on('disconnect', () => {
      // Clear leader for all sessions this socket was part of
      for (const shareCode of socketSessions) {
        if (socketUserId) {
          SessionService.clearLeader(shareCode, socketUserId);
          io.to(shareCode).emit('leader_change', { leaderUserId: null, leaderUserName: null });
        }
      }
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
}
