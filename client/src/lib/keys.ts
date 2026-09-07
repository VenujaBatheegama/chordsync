/**
 * Key selector utilities — all 12 keys, transposition between keys,
 * and capo suggestions for guitar.
 */

export const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type MusicalKey = typeof ALL_KEYS[number];

// Display labels (show flats as alternatives)
export const KEY_DISPLAY: Record<string, string> = {
  'C': 'C', 'C#': 'C# / Db', 'D': 'D', 'D#': 'D# / Eb', 'E': 'E',
  'F': 'F', 'F#': 'F# / Gb', 'G': 'G', 'G#': 'G# / Ab', 'A': 'A',
  'A#': 'A# / Bb', 'B': 'B',
};

// Keys that are "guitar-friendly" (have nice open chord shapes)
const GUITAR_FRIENDLY = new Set(['C', 'D', 'E', 'G', 'A', 'F']);

export function keyIndex(key: string): number {
  // Normalize flats to sharps
  const normalized = key.replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#')
    .replace('Ab', 'G#').replace('Bb', 'A#');
  return ALL_KEYS.indexOf(normalized as MusicalKey);
}

/**
 * Compute how many semitones to transpose from `fromKey` to `toKey`.
 * Returns a number in range [0, 11].
 */
export function semitonesFromTo(fromKey: string, toKey: string): number {
  const from = keyIndex(fromKey);
  const to = keyIndex(toKey);
  if (from === -1 || to === -1) return 0;
  return ((to - from) + 12) % 12;
}

export interface CapoSuggestion {
  capo: number;
  shapesKey: string;
  shapesKeyDisplay: string;
}

/**
 * Given a target key (the key you want the song to sound in),
 * return capo + chord-shapes suggestions.
 *
 * Logic: if you put a capo at fret N, you play shapes as if in the key
 * that is N semitones BELOW the target. For the suggestion to be useful,
 * the "shapes key" should be guitar-friendly.
 *
 * Example: target = Ab (index 8)
 *   capo 1 → shapes in G (8-1=7) ✅
 *   capo 4 → shapes in E (8-4=4) ✅
 *   capo 6 → shapes in D (8-6=2) ✅
 */
export function getCapoSuggestions(targetKey: string): CapoSuggestion[] {
  const targetIdx = keyIndex(targetKey);
  if (targetIdx === -1) return [];

  const suggestions: CapoSuggestion[] = [];

  for (let capo = 1; capo <= 7; capo++) {
    const shapesIdx = ((targetIdx - capo) + 12) % 12;
    const shapesKey = ALL_KEYS[shapesIdx];

    if (GUITAR_FRIENDLY.has(shapesKey)) {
      suggestions.push({
        capo,
        shapesKey,
        shapesKeyDisplay: KEY_DISPLAY[shapesKey] ?? shapesKey,
      });
    }
  }

  // Return at most 3 suggestions, preferring lower capo positions
  return suggestions.slice(0, 3);
}

/**
 * Given an original key and a target key, return the semitone offset
 * (positive = up, negative not used — we use modulo 12).
 */
export function transposeOffsetForKey(originalKey: string, targetKey: string): number {
  const offset = semitonesFromTo(originalKey, targetKey);
  // Use the shortest route (≤6 semitones up or down)
  return offset > 6 ? offset - 12 : offset;
}
