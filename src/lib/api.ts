import { createClient } from '@supabase/supabase-js';
import type { SearchResult, NormalizedSong, Playlist, PlaylistItem, SessionState } from './types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // --- Serverless Functions (Scraping) ---
  search: (q: string) =>
    request<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),

  getSong: (source: string, url: string) =>
    request<{ song: NormalizedSong }>(`/song?source=${encodeURIComponent(source)}&url=${encodeURIComponent(url)}`),

  fetchSongCover: async (title: string, artist: string): Promise<string | null> => {
    try {
      const cacheKey = `cover_${title}_${artist}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;

      // Use iTunes Search API
      const query = encodeURIComponent(`${title} ${artist}`.trim());
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
      if (!res.ok) return null;
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        // Upgrade to 300x300 image
        const imgUrl = data.results[0].artworkUrl100.replace('100x100bb', '300x300bb');
        localStorage.setItem(cacheKey, imgUrl);
        return imgUrl;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch cover:', err);
      return null;
    }
  },

  // --- Direct Supabase Database Calls ---
  getPlaylists: async (userName: string) => {
    // We get the user first
    const { data: user } = await supabase.from('User').select('id').eq('name', userName).single();
    if (!user) return { playlists: [] };
    
    const { data, error } = await supabase.from('Playlist').select('*').eq('ownerId', user.id).order('updatedAt', { ascending: false });
    if (error) throw error;
    return { playlists: data as Playlist[] };
  },

  createPlaylist: async (name: string, userName: string) => {
    let { data: user } = await supabase.from('User').select('id').eq('name', userName).single();
    if (!user) {
      const { data: newUser } = await supabase.from('User').insert({ name: userName }).select().single();
      user = newUser;
    }
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase.from('Playlist').insert({
      name, ownerId: user!.id, shareCode, updatedAt: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    return { playlist: data as Playlist };
  },

  getPlaylist: async (id: string) => {
    const { data, error } = await supabase.from('Playlist').select('*, items:PlaylistItem(*)').eq('id', id).single();
    if (error) throw error;
    if (data.items) {
      data.items.sort((a: any, b: any) => a.position - b.position);
    }
    return { playlist: data as Playlist };
  },

  getPlaylistByCode: async (shareCode: string) => {
    const { data, error } = await supabase.from('Playlist').select('*, items:PlaylistItem(*)').eq('shareCode', shareCode).single();
    if (error) throw error;
    if (data.items) {
      data.items.sort((a: any, b: any) => a.position - b.position);
    }
    return { playlist: data as Playlist };
  },

  addToPlaylist: async (playlistId: string, item: any) => {
    // Get max position
    const { data: existing } = await supabase.from('PlaylistItem').select('position').eq('playlistId', playlistId).order('position', { ascending: false }).limit(1);
    const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;
    
    const { data, error } = await supabase.from('PlaylistItem').insert({
      playlistId, source: item.source, sourceUrl: item.sourceUrl, title: item.title, artist: item.artist, addedBy: item.userName, position
    }).select().single();
    if (error) throw error;
    
    // Update playlist updatedAt
    await supabase.from('Playlist').update({ updatedAt: new Date().toISOString() }).eq('id', playlistId);
    
    return { item: data as PlaylistItem };
  },

  reorderPlaylistItem: async (playlistId: string, itemId: string, position: number) => {
    const { error } = await supabase.from('PlaylistItem').update({ position }).eq('id', itemId);
    if (error) throw error;
    return { success: true };
  },

  removeFromPlaylist: async (playlistId: string, itemId: string) => {
    const { error } = await supabase.from('PlaylistItem').delete().eq('id', itemId);
    if (error) throw error;
    return { success: true };
  },

  deletePlaylist: async (id: string) => {
    const { error } = await supabase.from('Playlist').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getSession: async (shareCode: string) => {
    const { data: playlist, error: pError } = await supabase.from('Playlist').select('*, items:PlaylistItem(*)').eq('shareCode', shareCode).single();
    if (pError) throw pError;
    if (playlist.items) {
      playlist.items.sort((a: any, b: any) => a.position - b.position);
    }
    
    let { data: session } = await supabase.from('Session').select('*').eq('shareCode', shareCode).single();
    if (!session) {
      // Create it
      const { data: newSession, error: sError } = await supabase.from('Session').insert({
        shareCode, playlistId: playlist.id, scrollPercent: 0, transposeOffset: 0
      }).select().single();
      if (sError) throw sError;
      session = newSession;
    }
    return { state: session as SessionState, playlist: playlist as Playlist };
  },
};
