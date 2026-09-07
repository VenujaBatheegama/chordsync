import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Link2, Plus, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { getUsername } from '../lib/user';
import type { SearchResult, Playlist } from '../lib/types';
import { SearchResultList } from '../components/chord/SearchResultList';

interface Props {
  onCreatePlaylist: () => void;
}

export function HomePage({ onCreatePlaylist }: Props) {
  const [query, setQuery] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const username = getUsername();

  // Load playlists
  useEffect(() => {
    if (username) {
      api.getPlaylists(username).then((r) => setPlaylists(r.playlists)).catch(console.error);
    }
  }, [username]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.search(query);
        setResults(res.results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleSelectResult(result: SearchResult) {
    navigate(`/song?source=${result.source}&url=${encodeURIComponent(result.sourceUrl)}`);
  }

  function handlePasteUrl() {
    const url = pasteUrl.trim();
    if (!url) return;
    const source = url.includes('ultimate-guitar') ? 'ultimate_guitar' : 'chordlanka';
    navigate(`/song?source=${source}&url=${encodeURIComponent(url)}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">
          Find chords.{' '}
          <span className="bg-gradient-to-r from-accent-400 to-purple-300 bg-clip-text text-transparent">
            Play together.
          </span>
        </h1>
        <p className="text-slate-500 text-sm">Search ChordLanka & Ultimate Guitar, save to playlists, sync live.</p>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            id="search-input"
            type="search"
            className="input pl-11 pr-4 py-3 text-base"
            placeholder="Search songs or artists…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-400 animate-spin" size={16} />
          )}
        </div>

        {/* Paste URL toggle */}
        <div>
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="btn-ghost text-xs gap-1.5 py-1"
          >
            <Link2 size={13} />
            Paste a URL instead
          </button>

          {showUrlInput && (
            <div className="flex gap-2 mt-2 animate-fade-in">
              <input
                id="paste-url-input"
                type="url"
                className="input text-sm flex-1"
                placeholder="https://www.chordlanka.com/... or https://tabs.ultimate-guitar.com/..."
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasteUrl()}
              />
              <button onClick={handlePasteUrl} className="btn-primary px-3 py-2">Go</button>
              <button onClick={() => setShowUrlInput(false)} className="btn-ghost px-2">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {(query || searching) && (
        <SearchResultList
          results={results}
          loading={searching}
          onSelect={handleSelectResult}
          playlists={playlists}
          onPlaylistAdded={() => api.getPlaylists(username!).then((r) => setPlaylists(r.playlists)).catch(() => {})}
        />
      )}

      {/* Playlists */}
      {!query && playlists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your playlists</h2>
            <button onClick={onCreatePlaylist} className="btn-ghost text-xs gap-1">
              <Plus size={13} />
              New
            </button>
          </div>
          <div className="grid gap-2">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                className="glass rounded-xl p-4 flex items-center justify-between text-left
                           hover:border-white/20 hover:bg-white/5 transition-all group"
              >
                <div>
                  <p className="text-white font-medium text-sm group-hover:text-accent-400 transition-colors">
                    {pl.name}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">{pl._count?.items ?? 0} songs</p>
                </div>
                <span className="text-accent-500 text-xs font-mono">/{pl.shareCode}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!query && playlists.length === 0 && username && (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm mb-3">You don't have any playlists yet.</p>
          <button onClick={onCreatePlaylist} className="btn-primary">
            <Plus size={16} />
            Create a playlist
          </button>
        </div>
      )}
    </div>
  );
}
