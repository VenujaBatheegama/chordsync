import { Music, Heart, Flame, Star, Zap, Disc } from 'lucide-react';
import type { Playlist } from '../../lib/types';

interface PlaylistCardProps {
  playlist: Playlist;
  onClick: (playlist: Playlist) => void;
}

const GRADIENTS = [
  'from-purple-500 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-blue-400 to-cyan-500',
  'from-fuchsia-500 to-pink-500'
];

const ICONS = [Heart, Music, Flame, Star, Zap, Disc];

export function PlaylistCard({ playlist, onClick }: PlaylistCardProps) {
  // Deterministic styling based on playlist name length and first char
  const charCode = playlist.name.charCodeAt(0) || 0;
  const hash = playlist.name.length + charCode;
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const Icon = ICONS[hash % ICONS.length];

  return (
    <button
      onClick={() => onClick(playlist)}
      className="glass-card group flex items-center gap-4 p-4 rounded-xl text-left hover:bg-surface-700 transition-colors border border-surface-700 hover:border-surface-600 w-full"
    >
      <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
        <Icon size={24} className="text-white drop-shadow-sm" fill="currentColor" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-white font-semibold truncate group-hover:text-accent-400 transition-colors">
          {playlist.name}
        </h3>
        <p className="text-slate-400 text-xs mt-0.5">{playlist._count?.items ?? 0} songs</p>
      </div>
    </button>
  );
}
