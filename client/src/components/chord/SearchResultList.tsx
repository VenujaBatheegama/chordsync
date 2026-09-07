import { useState } from 'react';
import type { SearchResult, Playlist } from '../../lib/types';
import { ExternalLink, Music, ListPlus, Check, Loader2, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { getUsername } from '../../lib/user';

interface Props {
  results: SearchResult[];
  loading: boolean;
  onSelect: (result: SearchResult) => void;
  playlists?: Playlist[];
  onPlaylistAdded?: () => void;
}

export function SearchResultList({ results, loading, onSelect, playlists, onPlaylistAdded }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Music size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No results. Try a different search or paste a URL below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <p className="text-slate-500 text-xs px-1">
        {results.length} results — click a song to view chords
      </p>
      {results.map((result, i) => (
        <SearchResultItem
          key={i}
          result={result}
          onSelect={onSelect}
          playlists={playlists}
          onPlaylistAdded={onPlaylistAdded}
        />
      ))}
    </div>
  );
}

function SearchResultItem({
  result,
  onSelect,
  playlists,
  onPlaylistAdded,
}: {
  result: SearchResult;
  onSelect: (r: SearchResult) => void;
  playlists?: Playlist[];
  onPlaylistAdded?: () => void;
}) {
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const username = getUsername();

  async function handleQuickAdd(e: React.MouseEvent, playlistId: string) {
    e.stopPropagation();
    setAdding(playlistId);
    try {
      await api.addToPlaylist(playlistId, {
        source: result.source,
        sourceUrl: result.sourceUrl,
        title: result.title,
        artist: result.artist,
        userName: username || 'Anonymous',
      });
      setAdded(playlistId);
      setTimeout(() => {
        setShowPlaylists(false);
        setAdded(null);
        onPlaylistAdded?.();
      }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="relative">
      <div
        className="glass rounded-xl flex items-center gap-3 px-4 py-3
                   hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer group"
        onClick={() => onSelect(result)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(result)}
      >
        {/* Song info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate group-hover:text-accent-400 transition-colors">
            {result.title}
          </p>
          <p className="text-slate-500 text-xs mt-0.5 truncate">{result.artist}</p>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={result.source === 'chordlanka' ? 'badge-cl' : 'badge-ug'}>
            {result.source === 'chordlanka' ? 'ChordLanka' : 'UG'}
          </span>

          {/* Quick add to playlist */}
          {username && playlists && playlists.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowPlaylists(!showPlaylists); }}
              className="btn-ghost p-1.5 text-slate-500 hover:text-accent-400"
              title="Add to playlist"
            >
              <ListPlus size={15} />
            </button>
          )}

          {/* Open source link */}
          <a
            href={result.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-slate-600 hover:text-slate-400 transition-colors p-1"
            title="Open source page"
          >
            <ExternalLink size={13} />
          </a>

          <ChevronRight size={14} className="text-slate-600 group-hover:text-accent-400 transition-colors" />
        </div>
      </div>

      {/* Inline playlist picker */}
      {showPlaylists && playlists && (
        <div
          className="absolute right-0 top-full mt-1 z-30 glass rounded-xl p-2 min-w-[200px] shadow-2xl animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-slate-500 text-xs px-2 py-1 font-medium uppercase tracking-wider">
            Add to playlist
          </p>
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={(e) => handleQuickAdd(e, pl.id)}
              disabled={!!adding || added === pl.id}
              className="w-full text-left flex items-center justify-between gap-2 px-2 py-2 rounded-xl
                         hover:bg-white/10 transition-colors text-sm text-slate-300 hover:text-white"
            >
              <span className="truncate">{pl.name}</span>
              {adding === pl.id && <Loader2 size={13} className="animate-spin text-accent-400" />}
              {added === pl.id && <Check size={13} className="text-success" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
