// Typed API client

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

import type { SearchResult, NormalizedSong, Playlist, PlaylistItem, SessionState } from './types';

export const api = {
  search: (q: string) =>
    request<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),

  getSong: (source: string, url: string) =>
    request<{ song: NormalizedSong }>(`/song?source=${encodeURIComponent(source)}&url=${encodeURIComponent(url)}`),

  getPlaylists: (userName: string) =>
    request<{ playlists: Playlist[] }>(`/playlists?userName=${encodeURIComponent(userName)}`),

  createPlaylist: (name: string, userName: string) =>
    request<{ playlist: Playlist }>('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, userName }),
    }),

  getPlaylist: (id: string) =>
    request<{ playlist: Playlist }>(`/playlists/${id}`),

  getPlaylistByCode: (shareCode: string) =>
    request<{ playlist: Playlist }>(`/playlists/by-code/${shareCode}`),

  addToPlaylist: (playlistId: string, item: { source: string; sourceUrl: string; title: string; artist: string; userName: string }) =>
    request<{ item: PlaylistItem }>(`/playlists/${playlistId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  reorderPlaylistItem: (playlistId: string, itemId: string, position: number) =>
    request<{ success: boolean }>(`/playlists/${playlistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ position }),
    }),

  removeFromPlaylist: (playlistId: string, itemId: string) =>
    request<{ success: boolean }>(`/playlists/${playlistId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  deletePlaylist: (id: string) =>
    request<{ success: boolean }>(`/playlists/${id}`, { method: 'DELETE' }),

  getSession: (shareCode: string) =>
    request<{ state: SessionState; playlist: Playlist }>(`/session/${shareCode}`),
};
