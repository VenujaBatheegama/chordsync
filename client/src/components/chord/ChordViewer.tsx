import type { NormalizedSong, SongSection, LyricLine } from '../../lib/types';
import { transposeSong } from '../../lib/transpose';
import { ExternalLink } from 'lucide-react';

interface Props {
  song: NormalizedSong;
  transposeOffset: number;
  fontSize: number;
}

export function ChordViewer({ song, transposeOffset, fontSize }: Props) {
  const displayed = transposeSong(song, transposeOffset);

  return (
    <div className="space-y-2" style={{ fontSize: `${fontSize}px` }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-white">{displayed.title}</h1>
            <p className="text-slate-400 mt-0.5">{displayed.artist}</p>
          </div>
          <a
            href={song.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs flex-shrink-0 mt-1"
          >
            <ExternalLink size={12} />
            {song.source === 'chordlanka' ? 'ChordLanka' : 'Ultimate Guitar'}
          </a>
        </div>

        {(displayed.key || displayed.capo != null) && (
          <div className="flex gap-3 mt-3">
            {displayed.key && (
              <span className="badge bg-accent-500/20 text-accent-400 border border-accent-500/30">
                Key: {displayed.key}
              </span>
            )}
            {displayed.capo != null && displayed.capo > 0 && (
              <span className="badge bg-slate-500/20 text-slate-300 border border-slate-500/30">
                Capo {displayed.capo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sections */}
      {displayed.sections.map((section, si) => (
        <SectionBlock key={si} section={section} />
      ))}
    </div>
  );
}

function SectionBlock({ section }: { section: SongSection }) {
  return (
    <div className="mb-8">
      {section.label && (
        <p className="section-label">{section.label}</p>
      )}
      <div className="space-y-1">
        {section.lines.map((line, li) => (
          <LyricLineBlock key={li} line={line} />
        ))}
      </div>
    </div>
  );
}

function LyricLineBlock({ line }: { line: LyricLine }) {
  if (line.chords.length === 0) {
    return (
      <div className="flex flex-col min-w-max">
        <span className="lyrics-text font-mono text-[1.05em]">{line.lyrics || '\u00a0'}</span>
      </div>
    );
  }

  // Build the chord row string with correct spacing
  let chordRowStr = '';
  let currentIndex = 0;
  
  // Sort chords by position
  const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);

  for (const chord of sortedChords) {
    const spacesNeeded = Math.max(0, chord.position - currentIndex);
    chordRowStr += ' '.repeat(spacesNeeded) + chord.symbol;
    currentIndex = chord.position + chord.symbol.length;
  }

  return (
    <div className="flex flex-col min-w-max pt-3">
      <span className="chord-row text-accent-400 font-mono font-semibold text-[0.9em] whitespace-pre select-none cursor-default">{chordRowStr}</span>
      <span className="lyrics-text font-mono text-[1.05em] whitespace-pre">{line.lyrics || '\u00a0'}</span>
    </div>
  );
}
