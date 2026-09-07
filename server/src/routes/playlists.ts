import { Router } from 'express';
import { supabase } from '../db/client.js';
import { randomBytes } from 'crypto';

const router = Router();

function generateShareCode(): string {
  return randomBytes(4).toString('hex'); // 8-char hex code
}

// Ensure user exists in DB (lazy creation), returns user id
async function ensureUser(userName: string): Promise<string> {
  const { data: existing } = await supabase.from('User').select('id').eq('name', userName).single();
  if (existing) return existing.id;
  
  const { data: created } = await supabase.from('User').insert({ name: userName }).select('id').single();
  return created!.id;
}

// GET /api/playlists?userId=...  (by name — this is username-only auth)
router.get('/', async (req, res) => {
  const userName = req.query.userName as string;
  if (!userName) {
    return res.status(400).json({ error: 'userName query param required' });
  }

  const { data: user } = await supabase.from('User').select('id').eq('name', userName).maybeSingle();
  if (!user) return res.json({ playlists: [] });

  const { data: playlists } = await supabase
    .from('Playlist')
    .select('*, PlaylistItem(count)')
    .eq('ownerId', user.id)
    .order('createdAt', { ascending: false });

  if (!playlists) return res.json({ playlists: [] });

  // Map to match old prisma output format
  const formatted = playlists.map((p: any) => ({
    ...p,
    _count: { items: p.PlaylistItem?.[0]?.count || 0 }
  }));

  return res.json({ playlists: formatted });
});

// POST /api/playlists  { name, userName }
router.post('/', async (req, res) => {
  const { name, userName } = req.body as { name: string; userName: string };
  if (!name || !userName) {
    return res.status(400).json({ error: 'name and userName are required' });
  }

  const ownerId = await ensureUser(userName);
  const shareCode = generateShareCode();
  
  const { data: playlist } = await supabase.from('Playlist').insert({
    name,
    ownerId,
    shareCode,
    updatedAt: new Date().toISOString()
  }).select('*').single();

  return res.status(201).json({ playlist: { ...playlist, items: [] } });
});

// GET /api/playlists/by-code/:shareCode  (for session joining)
router.get('/by-code/:shareCode', async (req, res) => {
  const { data: playlist } = await supabase
    .from('Playlist')
    .select('*, items:PlaylistItem(*), owner:User(name)')
    .eq('shareCode', req.params.shareCode)
    .single();

  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  
  // Sort items since we can't reliably order nested selects in supabase JS
  playlist.items = (playlist.items || []).sort((a: any, b: any) => a.position - b.position);
  return res.json({ playlist });
});

// GET /api/playlists/:id
router.get('/:id', async (req, res) => {
  const { data: playlist } = await supabase
    .from('Playlist')
    .select('*, items:PlaylistItem(*), owner:User(name)')
    .eq('id', req.params.id)
    .single();

  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  playlist.items = (playlist.items || []).sort((a: any, b: any) => a.position - b.position);
  return res.json({ playlist });
});

// POST /api/playlists/:id/items  { source, sourceUrl, title, artist, userName }
router.post('/:id/items', async (req, res) => {
  const { source, sourceUrl, title, artist, userName } = req.body as {
    source: string;
    sourceUrl: string;
    title: string;
    artist: string;
    userName: string;
  };

  const { data: playlist } = await supabase.from('Playlist').select('id').eq('id', req.params.id).maybeSingle();
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  // Check if already exists
  const { data: existing } = await supabase
    .from('PlaylistItem')
    .select('id')
    .eq('playlistId', req.params.id)
    .eq('sourceUrl', sourceUrl)
    .maybeSingle();

  if (existing) return res.status(409).json({ error: 'Song already in playlist' });

  // Get max position
  const { data: items } = await supabase
    .from('PlaylistItem')
    .select('position')
    .eq('playlistId', req.params.id)
    .order('position', { ascending: false })
    .limit(1);

  const maxPos = items && items.length > 0 ? items[0].position : -1;

  const { data: item } = await supabase.from('PlaylistItem').insert({
    playlistId: req.params.id,
    source,
    sourceUrl,
    title,
    artist,
    position: maxPos + 1,
    addedBy: userName,
  }).select('*').single();

  return res.status(201).json({ item });
});

// PATCH /api/playlists/:id/items/:itemId  { position }  (reorder)
router.patch('/:id/items/:itemId', async (req, res) => {
  const { position } = req.body as { position: number };
  if (typeof position !== 'number') {
    return res.status(400).json({ error: 'position (number) required' });
  }

  // Get all items, reorder, bulk update
  const { data: items } = await supabase
    .from('PlaylistItem')
    .select('*')
    .eq('playlistId', req.params.id)
    .order('position', { ascending: true });

  if (!items) return res.status(404).json({ error: 'Playlist items not found' });

  const movingIdx = items.findIndex((i: any) => i.id === req.params.itemId);
  if (movingIdx === -1) return res.status(404).json({ error: 'Item not found' });

  // Splice and reassign positions
  const [moved] = items.splice(movingIdx, 1);
  items.splice(position, 0, moved);

  await Promise.all(
    items.map((item: any, idx: number) =>
      supabase.from('PlaylistItem').update({ position: idx }).eq('id', item.id)
    )
  );

  return res.json({ success: true });
});

// DELETE /api/playlists/:id/items/:itemId
router.delete('/:id/items/:itemId', async (req, res) => {
  const { error } = await supabase.from('PlaylistItem').delete().eq('id', req.params.itemId);
  if (error) return res.status(404).json({ error: 'Item not found' });
  return res.json({ success: true });
});

// DELETE /api/playlists/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('Playlist').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ error: 'Playlist not found' });
  return res.json({ success: true });
});

export default router;
