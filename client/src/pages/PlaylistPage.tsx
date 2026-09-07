import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Playlist, PlaylistItem } from '../lib/types';
import { PlaylistPanel } from '../components/playlist/PlaylistPanel';
import { ChevronLeft, Share2, Loader2, AlertCircle, Check, Search, Plus, X } from 'lucide-react';
import { SearchResultList } from '../components/chord/SearchResultList';
import type { SearchResult } from '../lib/types';

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getPlaylist(id)
      .then((r) => setPlaylist(r.playlist))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function handleItemClick(item: PlaylistItem) {
    navigate(`/song?source=${item.source}&url=${encodeURIComponent(item.sourceUrl)}`);
  }

  function handleReorder(items: PlaylistItem[]) {
    setPlaylist((prev) => prev ? { ...prev, items } : prev);
  }

  function handleRemove(itemId: string) {
    setPlaylist((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev
    );
  }

  function handleShare() {
    if (!playlist) return;
    const shareUrl = `${window.location.origin}/session/${playlist.shareCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Handle Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimeout) clearTimeout(searchTimeout);
    
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.search(searchQuery);
        setSearchResults(res.results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  async function handleAddSearchResult(result: SearchResult) {
    if (!playlist) return;
    try {
      await api.addToPlaylist(playlist.id, {
        source: result.source,
        sourceUrl: result.sourceUrl,
        title: result.title,
        artist: result.artist,
        userName: playlist.owner?.name || 'Owner'
      });
      // Refresh playlist
      const r = await api.getPlaylist(playlist.id);
      setPlaylist(r.playlist);
      
      // Close search and clear
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-accent-400" size={36} />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertCircle className="text-red-400 mx-auto mb-3" size={36} />
        <p className="text-slate-500 text-sm mb-6">{error || 'Playlist not found'}</p>
        <button onClick={() => navigate('/')} className="btn-ghost">
          <ChevronLeft size={16} />
          Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost text-xs py-1.5 px-2">
            <ChevronLeft size={14} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{playlist.name}</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {playlist.items.length} songs · by {playlist.owner?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowSearch(!showSearch)} className="btn-ghost text-sm p-2" title="Add Song">
            {showSearch ? <X size={16} /> : <Plus size={16} />}
          </button>
          <button onClick={handleShare} className="btn-primary text-sm">
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Add Song Search Panel */}
      {showSearch && (
        <div className="glass-card space-y-3 animate-fade-in border-accent-500/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="search"
              className="input pl-9 text-sm py-2"
              placeholder="Search for a song to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-400 animate-spin" size={14} />
            )}
          </div>
          
          {(searchQuery || isSearching) && (
            <div className="max-h-[300px] overflow-y-auto">
              <SearchResultList
                results={searchResults}
                loading={isSearching}
                onSelect={handleAddSearchResult}
              />
            </div>
          )}
        </div>
      )}

      {/* Share URL */}
      <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
        <span className="text-slate-500 text-xs">Session link:</span>
        <code className="text-accent-400 text-xs flex-1 truncate">
          {window.location.origin}/session/{playlist.shareCode}
        </code>
      </div>

      {/* Playlist */}
      <PlaylistPanel
        playlist={playlist}
        onItemClick={handleItemClick}
        onReorder={handleReorder}
        onRemove={handleRemove}
        activeItemId={null}
      />
    </div>
  );
}
