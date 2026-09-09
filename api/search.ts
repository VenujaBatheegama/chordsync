import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChordLankaAdapter } from './_lib/adapters/chordlanka.js';
import { UltimateGuitarAdapter } from './_lib/adapters/ultimateguitar.js';
import { SongCacheService } from './_lib/services/songCache.js';
import type { SearchResult } from './_lib/types.js';

const chordlanka = new ChordLankaAdapter();
const ultimateGuitar = new UltimateGuitarAdapter();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = (req.query.q as string)?.trim();
  if (!q) {
    return res.status(400).json({ error: 'q parameter is required' });
  }

  try {
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

    return res.status(200).json({ results: deduped });
  } catch (err) {
    console.error('[/api/search] Error:', err);
    return res.status(500).json({ error: 'Failed to search songs' });
  }
}
