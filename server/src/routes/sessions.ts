import { Router } from 'express';
import { SessionService } from '../services/sessionService.js';
import { supabase } from '../db/client.js';

const router = Router();

// GET /api/session/:shareCode  — fetch current session state for late joiners
router.get('/:shareCode', async (req, res) => {
  const { shareCode } = req.params;

  const { data: playlist } = await supabase
    .from('Playlist')
    .select('*, items:PlaylistItem(*), owner:User(name)')
    .eq('shareCode', shareCode)
    .single();

  if (playlist) {
    playlist.items = (playlist.items || []).sort((a: any, b: any) => a.position - b.position);
  }

  if (!playlist) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const state = SessionService.getOrCreate(shareCode, playlist.id);
  return res.json({ state, playlist });
});

export default router;
