import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/ui/Navbar';
import { UserSetupModal } from './components/ui/UserSetupModal';
import { HomePage } from './pages/HomePage';
import { SongPage } from './pages/SongPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { SessionPage } from './pages/SessionPage';
import { getUsername } from './lib/user';
import { api } from './lib/api';
import type { Playlist } from './lib/types';
import { X, Loader2 } from 'lucide-react';

export default function App() {
  const [username, setUsername] = useState<string | null>(getUsername());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  async function refreshPlaylists() {
    const u = getUsername();
    if (!u) return;
    try {
      const res = await api.getPlaylists(u);
      setPlaylists(res.playlists);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (username) refreshPlaylists();
  }, [username]);

  async function handleCreatePlaylist(e: React.FormEvent) {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name || !username) return;
    setCreatingPlaylist(true);
    try {
      await api.createPlaylist(name, username);
      await refreshPlaylists();
      setNewPlaylistName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingPlaylist(false);
    }
  }

  // Show setup modal if no username
  if (!username) {
    return <UserSetupModal onComplete={(name) => setUsername(name)} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Navbar onLogout={() => setUsername(null)} />

        <main className="pb-16">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  onCreatePlaylist={() => setShowCreateModal(true)}
                />
              }
            />
            <Route
              path="/song"
              element={
                <SongPage
                  playlists={playlists}
                  onRefreshPlaylists={refreshPlaylists}
                  onRequestNewPlaylist={() => setShowCreateModal(true)}
                />
              }
            />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/session/:shareCode" element={<SessionPage />} />
          </Routes>
        </main>

        {/* Create playlist modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          >
            <div className="glass-card w-full max-w-sm mx-4 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">New playlist</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost p-1.5 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-3">
                <input
                  id="new-playlist-name"
                  type="text"
                  className="input"
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  autoFocus
                  maxLength={64}
                />
                <button
                  type="submit"
                  disabled={creatingPlaylist || !newPlaylistName.trim()}
                  className="btn-primary justify-center py-2.5"
                >
                  {creatingPlaylist ? <Loader2 size={16} className="animate-spin" /> : null}
                  Create playlist
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}
