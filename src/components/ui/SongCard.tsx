import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { api } from '../../lib/api';
import type { SearchResult } from '../../lib/types';

interface SongCardProps {
  song: SearchResult;
  onClick: (song: SearchResult) => void;
  orientation?: 'vertical' | 'horizontal';
}

export function SongCard({ song, onClick, orientation = 'vertical' }: SongCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.fetchSongCover(song.title, song.artist).then((url) => {
      if (mounted && url) setCoverUrl(url);
    });
    return () => { mounted = false; };
  }, [song.title, song.artist]);

  if (orientation === 'horizontal') {
    return (
      <button 
        onClick={() => onClick(song)}
        className="group flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-surface-700 transition-colors"
      >
        <div className="w-12 h-12 rounded bg-surface-600 flex-shrink-0 overflow-hidden relative">
          {coverUrl ? (
            <img src={coverUrl} alt={song.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 bg-surface-700">
              <Play size={16} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play size={16} className="text-white fill-white" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{song.title}</p>
          <p className="text-xs text-slate-400 truncate">{song.artist}</p>
        </div>
      </button>
    );
  }

  // Vertical (Large square card)
  return (
    <button 
      onClick={() => onClick(song)}
      className="group flex flex-col gap-3 text-left w-36 sm:w-44 flex-shrink-0"
    >
      <div className="w-full aspect-square rounded-xl bg-surface-700 overflow-hidden relative shadow-lg">
        {coverUrl ? (
          <img src={coverUrl} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 bg-surface-700">
            <Play size={24} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-all">
            <Play size={20} className="text-surface-900 fill-surface-900 ml-1" />
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-white truncate">{song.title}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{song.artist}</p>
      </div>
    </button>
  );
}
