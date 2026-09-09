import { supabase } from '../db/client';
import type { NormalizedSong } from '../types';

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export const SongCacheService = {
  async get(source: string, sourceUrl: string): Promise<NormalizedSong | null> {
    const { data: entry } = await supabase
      .from('SongCache')
      .select('*')
      .eq('source', source)
      .eq('sourceUrl', sourceUrl)
      .single();

    if (!entry) return null;

    const ageMs = Date.now() - new Date(entry.fetchedAt).getTime();
    if (ageMs > CACHE_TTL_MS) {
      console.log(`[SongCache] Stale entry for ${sourceUrl}, will re-fetch`);
      return null;
    }

    return JSON.parse(entry.contentJson) as NormalizedSong;
  },

  async set(song: NormalizedSong): Promise<void> {
    await supabase.from('SongCache').upsert({
      source: song.source,
      sourceUrl: song.sourceUrl,
      title: song.title,
      artist: song.artist,
      key: song.key || null,
      capo: song.capo || null,
      contentJson: JSON.stringify(song),
      fetchedAt: new Date().toISOString(),
    }, { onConflict: 'source,sourceUrl' });
  },

  async getOrFetch(
    source: string,
    sourceUrl: string,
    fetcher: () => Promise<NormalizedSong>
  ): Promise<NormalizedSong> {
    const cached = await this.get(source, sourceUrl);
    if (cached) {
      console.log(`[SongCache] Cache hit: ${sourceUrl}`);
      return cached;
    }

    console.log(`[SongCache] Cache miss, fetching: ${sourceUrl}`);
    const song = await fetcher();
    await this.set(song);
    return song;
  },

  async search(query: string): Promise<{ source: 'chordlanka' | 'ultimate_guitar', sourceUrl: string, title: string, artist: string }[]> {
    const { data: hits } = await supabase
      .from('SongCache')
      .select('source, sourceUrl, title, artist')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .limit(15);

    if (!hits) return [];

    return hits.map((hit: any) => ({
      source: hit.source as 'chordlanka' | 'ultimate_guitar',
      sourceUrl: hit.sourceUrl,
      title: hit.title,
      artist: hit.artist,
    }));
  },
};
