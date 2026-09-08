import { useState } from 'react';
import {
  ALL_KEYS,
  KEY_DISPLAY,
  keyIndex,
  getCapoSuggestions,
  transposeOffsetForKey,
  type MusicalKey,
} from '../../lib/keys';
import { ChevronDown } from 'lucide-react';

interface Props {
  /** The original key detected from the song (e.g. "F") */
  originalKey: string | null;
  /** Currently selected target key */
  selectedKey: string | null;
  onKeyChange: (key: string, semitoneOffset: number) => void;
}

export function KeySelector({ originalKey, selectedKey, onKeyChange }: Props) {
  const [open, setOpen] = useState(false);

  const displayKey = selectedKey ?? originalKey;
  const capoSuggestions = displayKey ? getCapoSuggestions(displayKey) : [];
  const isTransposed = selectedKey && originalKey && selectedKey !== originalKey;

  function handleSelect(key: string) {
    const offset = originalKey ? transposeOffsetForKey(originalKey, key) : 0;
    onKeyChange(key, offset);
    setOpen(false);
  }

  return (
    <div className="flex items-start gap-3 flex-wrap">
      {/* Key dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs font-medium">Key</span>
        <div className="relative">
          <button
            id="key-selector-btn"
            onClick={() => setOpen(!open)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all
              ${isTransposed
                ? 'bg-accent-600/20 border-accent-500/50 text-accent-300'
                : 'bg-surface-700 border-white/10 text-white hover:border-white/20'
              }`}
          >
            {displayKey ? (KEY_DISPLAY[displayKey] ?? displayKey) : '—'}
            {isTransposed && (
              <span className="text-[10px] text-accent-400 font-mono ml-0.5">
                (was {originalKey})
              </span>
            )}
            <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute top-full mt-1 left-0 z-50 glass rounded-xl p-1.5 shadow-2xl
                            grid grid-cols-3 gap-0.5 min-w-[160px] animate-fade-in">
              {ALL_KEYS.map((key) => {
                const isOriginal = key === originalKey;
                const isSelected = key === (selectedKey ?? originalKey);
                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center
                      ${isSelected
                        ? 'bg-accent-600 text-white'
                        : isOriginal
                          ? 'bg-accent-600/15 text-accent-400 hover:bg-accent-600/25'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    title={isOriginal ? 'Original key' : undefined}
                  >
                    {key}
                    {isOriginal && !isSelected && (
                      <span className="block text-[9px] text-accent-500 leading-tight">orig</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reset to original */}
        {isTransposed && originalKey && (
          <button
            onClick={() => handleSelect(originalKey)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            Reset
          </button>
        )}
      </div>

      {/* Capo suggestions */}
      {displayKey && capoSuggestions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-[11px]">Capo options:</span>
          {capoSuggestions.map(({ capo, shapesKey }) => (
            <span
              key={capo}
              className="badge bg-surface-600/60 border border-white/10 text-slate-300 text-[11px] gap-1"
              title={`Put capo on fret ${capo} and play ${shapesKey} chord shapes`}
            >
              <span className="text-gold-400 font-semibold">Fret {capo}</span>
              <span className="text-slate-500">→</span>
              <span>{shapesKey} shapes</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
