import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChordLankaAdapter } from './_lib/adapters/chordlanka';
import { UltimateGuitarAdapter } from './_lib/adapters/ultimateguitar';
import { SongCacheService } from './_lib/services/songCache';

const chordlanka = new ChordLankaAdapter();
const ultimateGuitar = new UltimateGuitarAdapter();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    return res.status(200).json({ song });
  } catch (err) {
    console.error('[/api/song] Error:', err instanceof Error ? err.message : err);
    return res.status(502).json({
      error: 'Failed to fetch song',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
