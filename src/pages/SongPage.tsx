import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { NormalizedSong, Playlist } from '../lib/types';
import { ChordViewer } from '../components/chord/ChordViewer';
import { SongControls } from '../components/chord/SongControls';
import { AddToPlaylistDropdown } from '../components/chord/AddToPlaylistDropdown';
import { useAutoscroll } from '../hooks/useAutoscroll';
import { getUsername } from '../lib/user';
import { transposeOffsetForKey } from '../lib/keys';
import { ListPlus, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';

interface Props {
  playlists: Playlist[];
  onRefreshPlaylists: () => void;
  onRequestNewPlaylist: () => void;
}

export function SongPage({ playlists, onRefreshPlaylists, onRequestNewPlaylist }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const source = params.get('source') || '';
  const url = params.get('url') || '';

  const [song, setSong] = useState<NormalizedSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Key & transpose state
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [transposeOffset, setTransposeOffset] = useState(0);

  // UI state
  const [fontSize, setFontSize] = useState(14);
  const [autoscroll, setAutoscroll] = useState(false);
  const [autoscrollSpeed, setAutoscrollSpeed] = useState(30);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const username = getUsername();

  const { startScroll, stopScroll } = useAutoscroll(autoscrollSpeed);

  // Load song
  useEffect(() => {
    if (!source || !url) { setError('Missing source or URL'); setLoading(false); return; }
    setLoading(true);
    setError('');
    setSelectedKey(null);
    setTransposeOffset(0);
    api.getSong(source, url)
      .then((r) => setSong(r.song))
      .catch((err) => setError(err.message || 'Failed to load song'))
      .finally(() => setLoading(false));
  }, [source, url]);

  // Autoscroll effect
  useEffect(() => {
    if (autoscroll) startScroll();
    else stopScroll();
    return stopScroll;
  }, [autoscroll, autoscrollSpeed]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyChange(key: string, semitoneOffset: number) {
    setSelectedKey(key);
    setTransposeOffset(semitoneOffset);
  }

  function handleFineTuneTranspose(offset: number) {
    setTransposeOffset(offset);
    // When fine-tuning, clear the key selection (we're now "between" keys)
    setSelectedKey(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-accent-400 mx-auto" size={36} />
          <p className="text-slate-500 text-sm">Fetching chords…</p>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertCircle className="text-red-400 mx-auto mb-3" size={36} />
        <p className="text-white font-medium mb-1">Couldn't load song</p>
        <p className="text-slate-500 text-sm mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ChevronLeft size={16} />
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs py-1.5 px-2">
          <ChevronLeft size={14} />
          Back
        </button>

        {username && (
          <div className="relative" ref={addDropdownRef}>
            <button
              id="add-to-playlist-btn"
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="btn-primary text-sm"
            >
              <ListPlus size={16} />
              Add to playlist
            </button>
            {showAddDropdown && (
              <div className="absolute right-0 top-full mt-2 z-30">
                <AddToPlaylistDropdown
                  playlists={playlists}
                  songInfo={{ source, sourceUrl: url, title: song.title, artist: song.artist }}
                  onAdded={() => { setShowAddDropdown(false); onRefreshPlaylists(); }}
                  onRequestNewPlaylist={() => { setShowAddDropdown(false); onRequestNewPlaylist(); }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls (key selector + fine transpose + autoscroll) */}
      <div className="sticky bottom-4 z-40 sm:static sm:bottom-auto shadow-2xl sm:shadow-none rounded-2xl">
        <SongControls
          originalKey={song.key}
          selectedKey={selectedKey}
          onKeyChange={handleKeyChange}
          transposeOffset={transposeOffset}
          onTransposeChange={handleFineTuneTranspose}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          autoscroll={autoscroll}
          autoscrollSpeed={autoscrollSpeed}
          onAutoscrollToggle={() => setAutoscroll(!autoscroll)}
          onAutoscrollSpeedChange={setAutoscrollSpeed}
        />
      </div>

      {/* Chord view */}
      <div className="glass-card overflow-x-auto overflow-y-hidden">
        <ChordViewer song={song} transposeOffset={transposeOffset} fontSize={fontSize} />
      </div>
    </div>
  );
}
