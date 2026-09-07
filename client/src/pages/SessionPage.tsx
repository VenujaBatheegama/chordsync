import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Playlist, PlaylistItem, NormalizedSong, SessionState } from '../lib/types';
import { useSocket } from '../hooks/useSocket';
import { useAutoscroll } from '../hooks/useAutoscroll';
import { getUserId } from '../lib/user';
import { ChordViewer } from '../components/chord/ChordViewer';
import { SongControls } from '../components/chord/SongControls';
import { SyncBar } from '../components/session/SyncBar';
import { PlaylistPanel } from '../components/playlist/PlaylistPanel';
import { Loader2, AlertCircle, Music2 } from 'lucide-react';

export function SessionPage() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Current song state
  const [activeSong, setActiveSong] = useState<NormalizedSong | null>(null);
  const [songLoading, setSongLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [transposeOffset, setTransposeOffset] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const [autoscroll, setAutoscroll] = useState(false);
  const [autoscrollSpeed, setAutoscrollSpeed] = useState(30);

  // Follower mode: whether to auto-follow leader scroll
  const [isFollowing, setIsFollowing] = useState(true);
  const userId = getUserId();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastedScroll = useRef(0);

  const { startScroll, stopScroll } = useAutoscroll(autoscrollSpeed, contentRef as React.RefObject<HTMLElement>);

  // Load initial state via REST (late-joiner hydration)
  useEffect(() => {
    if (!shareCode) return;
    api.getSession(shareCode)
      .then((r) => {
        setPlaylist(r.playlist);
        if (r.state.currentItemId) {
          loadSong(r.playlist, r.state.currentItemId);
        }
        setTransposeOffset(r.state.transposeOffset);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shareCode]);

  // Socket.io connection
  const { sessionState, isConnected, pushStateUpdate, claimLeader } = useSocket(
    shareCode || '',
    playlist?.id || ''
  );

  const isLeader = sessionState?.leaderUserId === userId;

  // React to session state changes from socket (for followers)
  useEffect(() => {
    if (!sessionState || isLeader) return;

    // Follow song change
    if (sessionState.currentItemId && playlist) {
      const item = playlist.items.find((i) => i.id === sessionState.currentItemId);
      if (item && item.id !== activeSong?.sourceUrl) {
        loadSong(playlist, sessionState.currentItemId);
      }
    }

    // Follow transpose
    setTransposeOffset(sessionState.transposeOffset);

    // Follow scroll (only if in sync mode)
    if (isFollowing && contentRef.current) {
      const el = contentRef.current;
      const targetScroll = (sessionState.scrollPercent / 100) * (el.scrollHeight - el.clientHeight);
      el.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [sessionState, isLeader, isFollowing]);

  async function loadSong(pl: Playlist, itemId: string) {
    const item = pl.items.find((i) => i.id === itemId);
    if (!item) return;
    setSongLoading(true);
    setSelectedKey(null);
    setTransposeOffset(0);
    try {
      const res = await api.getSong(item.source, item.sourceUrl);
      setActiveSong(res.song);
    } catch (e) {
      console.error('Failed to load song:', e);
    } finally {
      setSongLoading(false);
    }
  }

  function handleItemClick(item: PlaylistItem) {
    if (!playlist) return;
    loadSong(playlist, item.id);
    if (isLeader) {
      pushStateUpdate({ currentItemId: item.id });
    }
  }

  // Broadcast scroll position (throttled) when leader
  const handleScroll = useCallback(() => {
    if (!isLeader || !contentRef.current) return;
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = setTimeout(() => {
      scrollThrottleRef.current = null;
      const el = contentRef.current!;
      const percent = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      if (Math.abs(percent - lastBroadcastedScroll.current) > 0.5) {
        lastBroadcastedScroll.current = percent;
        pushStateUpdate({ scrollPercent: percent });
      }
    }, 200);
  }, [isLeader, pushStateUpdate]);

  function handleTransposeChange(offset: number) {
    setTransposeOffset(offset);
    if (isLeader) pushStateUpdate({ transposeOffset: offset });
  }

  // Autoscroll
  useEffect(() => {
    if (autoscroll) startScroll();
    else stopScroll();
    return stopScroll;
  }, [autoscroll, autoscrollSpeed]);

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
        <p className="text-white mb-1">Session not found</p>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Session header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">{playlist.name}</h1>
          <p className="text-slate-500 text-xs">Session · {playlist.items.length} songs</p>
        </div>
      </div>

      {/* Sync bar */}
      <SyncBar
        sessionState={sessionState}
        isConnected={isConnected}
        isFollowing={isFollowing}
        onClaimLeader={claimLeader}
        onBackToSync={() => setIsFollowing(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-4">
        {/* Playlist sidebar */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="glass-card">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Playlist</p>
            <PlaylistPanel
              playlist={playlist}
              onItemClick={handleItemClick}
              onReorder={() => {}}
              onRemove={() => {}}
              activeItemId={sessionState?.currentItemId ?? null}
            />
          </div>
        </div>

        {/* Song viewer */}
        <div>
          {/* Controls */}
          <SongControls
            originalKey={activeSong?.key ?? null}
            selectedKey={selectedKey}
            onKeyChange={(key, offset) => { setSelectedKey(key); handleTransposeChange(offset); }}
            transposeOffset={transposeOffset}
            onTransposeChange={handleTransposeChange}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            autoscroll={autoscroll}
            autoscrollSpeed={autoscrollSpeed}
            onAutoscrollToggle={() => setAutoscroll(!autoscroll)}
            onAutoscrollSpeedChange={setAutoscrollSpeed}
          />

          <div
            ref={contentRef}
            className="glass-card mt-4 max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto"
            onScroll={() => {
              // If follower scrolls manually, break sync temporarily
              if (!isLeader && isFollowing) setIsFollowing(false);
              handleScroll();
            }}
          >
            {songLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-accent-400" size={28} />
              </div>
            )}
            {!songLoading && activeSong && (
              <ChordViewer song={activeSong} transposeOffset={transposeOffset} fontSize={fontSize} />
            )}
            {!songLoading && !activeSong && (
              <div className="text-center py-16 text-slate-600">
                <Music2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a song from the playlist to begin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
