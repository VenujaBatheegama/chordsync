import { Link, useNavigate } from 'react-router-dom';
import { Music2, List, LogOut } from 'lucide-react';
import { getUsername, clearUsername } from '../../lib/user';

interface Props {
  onLogout?: () => void;
}

export function Navbar({ onLogout }: Props) {
  const username = getUsername();
  const navigate = useNavigate();

  function handleLogout() {
    clearUsername();
    onLogout?.();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent-600/30 border border-accent-500/40 flex items-center justify-center
                          group-hover:bg-accent-600/50 transition-colors">
            <Music2 size={16} className="text-accent-400" />
          </div>
          <span className="font-semibold text-white text-sm">ChordSync</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link to="/" className="btn-ghost text-xs py-1.5 px-3">
            <List size={14} />
            Playlists
          </Link>

          {username && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-slate-400 text-xs hidden sm:block">
                👋 <span className="text-slate-300">{username}</span>
              </span>
              <button onClick={handleLogout} className="btn-ghost text-xs py-1.5 px-3" title="Change name">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
