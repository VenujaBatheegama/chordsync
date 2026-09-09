import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Plus, ChevronRight, Play } from 'lucide-react';
import { api } from '../lib/api';
import { getUsername } from '../lib/user';
import type { SearchResult, Playlist } from '../lib/types';
import { PlaylistCard } from '../components/playlist/PlaylistCard';
import { SongCard } from '../components/ui/SongCard';

interface Props {
  onCreatePlaylist: () => void;
}

export function HomePage({ onCreatePlaylist }: Props) {
  const [searchParams] = useSearchParams();
  const rawQuery = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recommended, setRecommended] = useState<SearchResult[]>([]);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const username = getUsername();

  // Load playlists and generate fake recommended
  useEffect(() => {
    if (username) {
      api.getPlaylists(username).then((r) => {
        setPlaylists(r.playlists);
        
        // Mock recommended/recently played based on a default search if empty
        api.search('popular').then((res) => setRecommended(res.results.slice(0, 8))).catch(console.error);
      }).catch(console.error);
    }
  }, [username]);

  // Debounced search
  useEffect(() => {
    if (!rawQuery.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.search(rawQuery);
        setResults(res.results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rawQuery]);

  function handleSelectResult(result: SearchResult) {
    navigate(`/song?source=${result.source}&url=${encodeURIComponent(result.sourceUrl)}`);
  }

  // If user is searching, show standard search results taking up the whole screen
  if (rawQuery || searching) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-white mb-6">Search Results for "{rawQuery}"</h2>
        {searching ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent-500" size={32} /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {results.map((r, i) => (
              <SongCard key={i} song={r} onClick={handleSelectResult} orientation="vertical" />
            ))}
            {results.length === 0 && <p className="text-slate-400 col-span-full">No results found.</p>}
          </div>
        )}
      </div>
    );
  }

  // Dashboard Layout
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
      
      {/* Left Column (Main Content) */}
      <div className="lg:col-span-8 space-y-12">
        
        {/* Collections You'll Love */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Collections You'll Love</h2>
            <button onClick={onCreatePlaylist} className="text-xs font-bold text-accent-500 hover:text-accent-400 uppercase tracking-widest">View All</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {playlists.slice(0, 6).map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} onClick={() => navigate(`/playlist/${pl.id}`)} />
            ))}
            {playlists.length === 0 && (
              <button onClick={onCreatePlaylist} className="glass-card flex items-center justify-center p-8 border-dashed border-2 border-surface-600 hover:border-accent-500 transition-colors w-full h-full min-h-[100px]">
                <span className="flex items-center gap-2 text-slate-400"><Plus size={18} /> Create your first playlist</span>
              </button>
            )}
          </div>
        </section>

        {/* Recently Played */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recently Played</h2>
            <button className="text-xs font-bold text-accent-500 hover:text-accent-400 uppercase tracking-widest">View All</button>
          </div>
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
              {recommended.map((song, i) => (
                <div key={i} className="snap-start">
                  <SongCard song={song} onClick={handleSelectResult} orientation="vertical" />
                </div>
              ))}
            </div>
            {/* Scroll arrow hint */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center shadow-xl cursor-pointer hover:bg-surface-500 transition-colors hidden md:flex">
              <ChevronRight size={18} className="text-white" />
            </div>
          </div>
        </section>

        {/* Shots (Placeholder) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shots</h2>
            <button className="text-xs font-bold text-accent-500 hover:text-accent-400 uppercase tracking-widest">View All</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[9/16] rounded-xl bg-surface-800 relative overflow-hidden group cursor-pointer border border-white/5 hover:border-white/20 transition-all">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                  <div className="flex items-center gap-1 bg-black/50 backdrop-blur rounded px-1.5 py-0.5">
                    <Play size={10} className="text-white fill-white" />
                    <span className="text-[10px] text-white font-medium">25.4k</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Column (Sidebar) */}
      <div className="lg:col-span-4">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recommended For You</h2>
            <button className="text-xs font-bold text-accent-500 hover:text-accent-400 uppercase tracking-widest">View All</button>
          </div>
          <div className="flex flex-col gap-2">
            {recommended.slice().reverse().map((song, i) => (
              <SongCard key={i} song={song} onClick={handleSelectResult} orientation="horizontal" />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
