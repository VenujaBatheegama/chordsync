import { useState } from 'react';
import type { Playlist } from '../../lib/types';
import { api } from '../../lib/api';
import { getUsername } from '../../lib/user';
import { Plus, X, Check, Loader2 } from 'lucide-react';

interface Props {
  playlists: Playlist[];
  songInfo: { source: string; sourceUrl: string; title: string; artist: string };
  onAdded: () => void;
  onRequestNewPlaylist: () => void;
}

export function AddToPlaylistDropdown({ playlists, songInfo, onAdded, onRequestNewPlaylist }: Props) {
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const username = getUsername() || 'Anonymous';

  async function handleAdd(playlistId: string) {
    setAdding(playlistId);
    setError('');
    try {
      await api.addToPlaylist(playlistId, { ...songInfo, userName: username });
      setAdded(playlistId);
      setTimeout(onAdded, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="glass rounded-2xl p-2 min-w-[220px] shadow-2xl animate-slide-up">
      <p className="text-slate-500 text-xs px-2 py-1 font-medium uppercase tracking-wider">Add to playlist</p>

      {playlists.length === 0 ? (
        <p className="text-slate-500 text-xs px-2 py-2">No playlists yet</p>
      ) : (
        playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => handleAdd(pl.id)}
            disabled={!!adding || added === pl.id}
            className="w-full text-left flex items-center justify-between gap-2 px-2 py-2 rounded-xl
                       hover:bg-white/10 transition-colors text-sm text-slate-300 hover:text-white
                       disabled:opacity-60"
          >
            <span className="truncate">{pl.name}</span>
            {adding === pl.id && <Loader2 size={14} className="animate-spin text-accent-400" />}
            {added === pl.id && <Check size={14} className="text-success" />}
          </button>
        ))
      )}

      {error && <p className="text-red-400 text-xs px-2 py-1">{error}</p>}

      <div className="border-t border-white/10 mt-1 pt-1">
        <button
          onClick={onRequestNewPlaylist}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/10
                     transition-colors text-xs text-accent-400 hover:text-accent-300"
        >
          <Plus size={14} />
          New playlist
        </button>
      </div>
    </div>
  );
}
