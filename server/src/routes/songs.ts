import { Router } from 'express';
import { ChordLankaAdapter } from '../adapters/chordlanka.js';
import { UltimateGuitarAdapter } from '../adapters/ultimateguitar.js';
import { SongCacheService } from '../services/songCache.js';
import type { SearchResult } from '../types.js';

const router = Router();
const chordlanka = new ChordLankaAdapter();
const ultimateGuitar = new UltimateGuitarAdapter();

// GET /api/search?q=...
router.get('/search', async (req, res) => {
  const q = (req.query.q as string)?.trim();
  if (!q) {
    return res.status(400).json({ error: 'q parameter is required' });
  }

  // Fan out to DB cache and both adapters in parallel
  const [dbResults, clResults, ugResults] = await Promise.allSettled([
    SongCacheService.search(q),
    chordlanka.search(q),
    ultimateGuitar.search(q),
  ]);

  const results: SearchResult[] = [
    ...(dbResults.status === 'fulfilled' ? dbResults.value : []),
    ...(clResults.status === 'fulfilled' ? clResults.value : []),
    ...(ugResults.status === 'fulfilled' ? ugResults.value : []),
  ];

  // Deduplicate by sourceUrl
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.sourceUrl)) return false;
    seen.add(r.sourceUrl);
    return true;
  });

  return res.json({ results: deduped });
});

// GET /api/song?source=chordlanka&url=https://...
router.get('/song', async (req, res) => {
  const source = req.query.source as string;
  const url = req.query.url as string;

  if (!source || !url) {
    return res.status(400).json({ error: 'source and url parameters are required' });
  }

  if (source !== 'chordlanka' && source !== 'ultimate_guitar') {
    return res.status(400).json({ error: 'source must be chordlanka or ultimate_guitar' });
  }

  try {
    const song = await SongCacheService.getOrFetch(source, url, async () => {
      if (source === 'chordlanka') {
        return chordlanka.getChords(url);
      } else {
        return ultimateGuitar.getChords(url);
      }
    });

    return res.json({ song });
  } catch (err) {
    console.error('[/api/song] Error:', err instanceof Error ? err.message : err);
    return res.status(502).json({
      error: 'Failed to fetch song',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
