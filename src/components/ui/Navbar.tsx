import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getUsername, clearUsername } from '../../lib/user';

interface Props {
  onLogout?: () => void;
}

export function Navbar({ onLogout }: Props) {
  const username = getUsername();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  // Keep local search input in sync with URL
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  function handleLogout() {
    clearUsername();
    onLogout?.();
    navigate('/');
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (location.pathname !== '/') {
      navigate(`/?q=${encodeURIComponent(val)}`);
    } else {
      // Update URL without full reload if already on home
      const newUrl = val ? `/?q=${encodeURIComponent(val)}` : '/';
      window.history.replaceState({}, '', newUrl);
      // Dispatch popstate so HomePage can re-render if it listens, or just let HomePage read from URL
      window.dispatchEvent(new Event('popstate'));
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-surface-900 border-b border-white/5 py-4">
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between gap-8">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-sm">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">GuitarChords.com</span>
        </Link>

        {/* Center Search */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            placeholder="Search songs, artists, genres"
            className="w-full bg-surface-800 border-none rounded-full pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:ring-1 focus:ring-accent-500 transition-all"
          />
        </div>

        {/* Right Links */}
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-white hover:text-accent-400 transition-colors">Explore</Link>
          <Link to="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Shots</Link>
          <Link to="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Favorites</Link>
          
          {username ? (
            <button onClick={handleLogout} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              {username} (Logout)
            </button>
          ) : (
            <button className="bg-surface-800 text-accent-500 hover:bg-surface-700 font-medium text-sm px-6 py-2 rounded-full transition-all border border-surface-600/50">
              Sign Up
            </button>
          )}
        </nav>

      </div>
    </header>
  );
}
