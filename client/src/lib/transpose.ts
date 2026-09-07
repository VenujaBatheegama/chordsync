// Chord transposition utility

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const ENHARMONIC: Record<string, string> = {
  'Cb': 'B', 'Fb': 'E', 'E#': 'F', 'B#': 'C',
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

function noteIndex(note: string): number {
  let n = ENHARMONIC[note] ?? note;
  const idx = SHARP_NOTES.indexOf(n);
  if (idx !== -1) return idx;
  return FLAT_NOTES.indexOf(n);
}

function transposeNote(note: string, semitones: number, preferFlats = false): string {
  const idx = noteIndex(note);
  if (idx === -1) return note; // unrecognized, pass through
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return preferFlats ? FLAT_NOTES[newIdx] : SHARP_NOTES[newIdx];
}

/**
 * Transpose a chord symbol by the given number of semitones.
 * Handles: simple chords (G), with suffix (Am7), slash chords (G/B).
 */
export function transposeChord(symbol: string, semitones: number): string {
  if (semitones === 0) return symbol;

  // Handle slash chord: "G/B"
  if (symbol.includes('/')) {
    const [root, bass] = symbol.split('/');
    return `${transposeChord(root, semitones)}/${transposeChord(bass, semitones)}`;
  }

  // Extract root note (1 or 2 chars: A-G + optional b/#)
  const rootMatch = symbol.match(/^([A-G][b#]?)(.*)/);
  if (!rootMatch) return symbol;

  const [, root, suffix] = rootMatch;
  const preferFlats = root.includes('b') || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(root);
  const newRoot = transposeNote(root, semitones, preferFlats);
  return `${newRoot}${suffix}`;
}

/**
 * Transpose all chords in a NormalizedSong (returns new object, no mutation).
 */
export function transposeSong<T extends { sections: Array<{ lines: Array<{ chords: Array<{ symbol: string; position: number }> }> }> }>(
  song: T,
  semitones: number
): T {
  if (semitones === 0) return song;
  return {
    ...song,
    sections: song.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        chords: line.chords.map((chord) => ({
          ...chord,
          symbol: transposeChord(chord.symbol, semitones),
        })),
      })),
    })),
  };
}
