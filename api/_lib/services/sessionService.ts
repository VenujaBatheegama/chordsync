import fs from 'fs';
import path from 'path';
import type { SessionState } from '../types';

// In-memory session store: shareCode → SessionState
const sessions = new Map<string, SessionState>();

// Persist snapshots to a JSON file so server restarts don't lose state
const SNAPSHOT_PATH = path.join(process.cwd(), 'sessions.json');

function loadSnapshots(): void {
  if (fs.existsSync(SNAPSHOT_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8')) as Record<string, SessionState>;
      for (const [code, state] of Object.entries(data)) {
        sessions.set(code, state);
      }
      console.log(`[SessionService] Loaded ${sessions.size} session snapshots`);
    } catch {
      console.warn('[SessionService] Could not parse sessions.json, starting fresh');
    }
  }
}

function saveSnapshots(): void {
  const obj: Record<string, SessionState> = {};
  for (const [code, state] of sessions.entries()) {
    obj[code] = state;
  }
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(obj, null, 2));
}

loadSnapshots();

export const SessionService = {
  get(shareCode: string): SessionState | null {
    return sessions.get(shareCode) ?? null;
  },

  getOrCreate(shareCode: string, playlistId: string): SessionState {
    if (!sessions.has(shareCode)) {
      const state: SessionState = {
        playlistId,
        shareCode,
        currentItemId: null,
        scrollPercent: 0,
        transposeOffset: 0,
        leaderUserId: null,
        leaderUserName: null,
      };
      sessions.set(shareCode, state);
      saveSnapshots();
    }
    return sessions.get(shareCode)!;
  },

  update(shareCode: string, patch: Partial<SessionState>): SessionState | null {
    const existing = sessions.get(shareCode);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    sessions.set(shareCode, updated);
    saveSnapshots();
    return updated;
  },

  clearLeader(shareCode: string, userId: string): void {
    const state = sessions.get(shareCode);
    if (state && state.leaderUserId === userId) {
      const updated = { ...state, leaderUserId: null, leaderUserName: null };
      sessions.set(shareCode, updated);
      saveSnapshots();
    }
  },

  delete(shareCode: string): void {
    sessions.delete(shareCode);
    saveSnapshots();
  },
};
