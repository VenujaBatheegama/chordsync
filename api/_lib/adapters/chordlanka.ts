import * as cheerio from 'cheerio';
import type {
  SourceAdapter,
  SearchResult,
  NormalizedSong,
  SongSection,
  LyricLine,
  ChordPosition,
} from '../types.js';
import { globalRateLimiter } from './rateLimiter.js';

const BASE_URL = 'https://www.chordlanka.com';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

export class ChordLankaAdapter implements SourceAdapter {
  async search(query: string): Promise<SearchResult[]> {
    try {
      await globalRateLimiter.throttle('chordlanka');
      const url = new URL(`${BASE_URL}/`);
      url.searchParams.set('s', query);
      const response = await fetch(url.toString(), { headers: HEADERS });
      const text = await response.text();
      const $ = cheerio.load(text);
      const results: SearchResult[] = [];

      // ChordLanka search results: list of song links with artist/title info
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        // Song URLs follow the pattern /chords/artist/.../song/...
        if (!href.includes('/chords/') || !href.includes('/song/')) return;

        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

        // Extract title and artist from the URL path
        const pathParts = href.split('/');
        const songIdx = pathParts.indexOf('song');
        const artistIdx = pathParts.indexOf('artist');

        const rawTitle = songIdx >= 0 ? decodeURIComponent(pathParts[songIdx + 1] || '') : '';
        const rawArtist = artistIdx >= 0 ? decodeURIComponent(pathParts[artistIdx + 1] || '') : '';

        // Also try to get text from the element and its parents
        const linkText = $(el).text().trim();
        const title = rawTitle.replace(/\+/g, ' ') || linkText || 'Unknown';
        const artist = rawArtist.replace(/\+/g, ' ') || 'Unknown';

        if (title && fullUrl && !results.find((r) => r.sourceUrl === fullUrl)) {
          results.push({
            title,
            artist,
            source: 'chordlanka',
            sourceUrl: fullUrl,
          });
        }
      });

      return results.slice(0, 20);
    } catch (err) {
      console.error('[ChordLanka] search error:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getChords(url: string): Promise<NormalizedSong> {
    await globalRateLimiter.throttle('chordlanka');
    const response = await fetch(url, { headers: HEADERS });
    const text = await response.text();
    const $ = cheerio.load(text);

    // ----- Title and Artist -----
    // ChordLanka uses <h1 id="song_title"> and the <h2> below it for artist
    const rawTitle = $('#song_title').text().trim() ||
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.split('—')[0].trim() || 'Unknown';

    // Strip "Chords" suffix that ChordLanka appends
    const title = rawTitle.replace(/\s*chords?\s*$/i, '').trim();

    // Artist is in the h2 after the h1, or in the og:title after "—"
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const artistFromOg = ogTitle.split('—')[1]?.split('|')[0]?.trim() || '';
    const artistFromH2 = $('h1').next('h2').find('a').first().text().trim() ||
      $('h1').next('h2').text().trim();
    const artist = artistFromOg || artistFromH2 || 'Unknown';

    // ----- Key -----
    // ChordLanka stores the original key in: <pre transpose-def="..." data-key="F">
    const key = $('pre[data-key]').attr('data-key') || null;

    // ----- Capo -----
    // Sometimes mentioned in text near the pre block
    const capoText = $('[class*="capo"], .capo').first().text();
    const capoMatch = capoText.match(/\d+/);
    const capo = capoMatch ? parseInt(capoMatch[0], 10) : null;

    // ----- Chord + Lyric content -----
    // ChordLanka uses <pre transpose-ref="..."> for the actual chord/lyric content.
    // Format: chord symbols on one line, lyrics on the next line.
    // Section labels like [Chorus], [Verse] appear as text lines.
    const contentPre = $('pre[transpose-ref]').first();
    const rawText = contentPre.length ? contentPre.text() : $('pre').last().text();

    const sections = parseChordLankaText(rawText);

    return {
      title,
      artist,
      key,
      capo,
      sourceUrl: url,
      source: 'chordlanka',
      sections,
    };
  }
}

/**
 * Parse ChordLanka's plain-text chord+lyric format.
 *
 * The format uses space-aligned chord symbols on one line above lyrics:
 *   F      Bb         C          F
 *   Ahasata sonduruda  sanda ketharam
 *
 * Section headers look like: [Chorus], [Verse], [Intro] etc.
 * Tab lines (|F  |-  |Gm|) are treated as chord-only lines.
 */
function parseChordLankaText(text: string): SongSection[] {
  const sections: SongSection[] = [];
  let currentSection: SongSection = { label: 'Intro', lines: [] };
  const rawLines = text.split('\n');
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Section header: [Chorus], [Verse 1], [Bridge], etc.
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { label: formatSectionLabel(sectionMatch[1]), lines: [] };
      i++;
      continue;
    }

    // Skip pure separator lines (-----, ===, empty)
    if (!trimmed || /^[-=|]+$/.test(trimmed)) {
      i++;
      continue;
    }

    // Tab/diagram lines (e.g. |F  |-   |Gm  | -  |) — treat as chord-only line
    if (isTabLine(trimmed)) {
      const chords = parseTabLine(trimmed);
      if (chords.length > 0) {
        currentSection.lines.push({ lyrics: chords.map((c) => c.symbol).join('  '), chords: [] });
      }
      i++;
      continue;
    }

    // Determine if this line is a chord line or a lyric line.
    // Chord lines consist mostly of chord tokens separated by spaces.
    if (isChordLine(trimmed)) {
      // Look ahead for the lyric line (next non-empty, non-chord line)
      const nextIdx = i + 1;
      const nextLine = nextIdx < rawLines.length ? rawLines[nextIdx] : '';
      const nextTrimmed = nextLine.trim();

      if (nextTrimmed && !isChordLine(nextTrimmed) && !nextTrimmed.match(/^\[[^\]]+\]$/)) {
        // Chord line + lyric line pair
        const chords = parseChordLine(line, nextLine);
        currentSection.lines.push({ lyrics: nextTrimmed, chords });
        i += 2;
      } else {
        // Chord line with no lyrics below — show chords as the text too
        const chords = parseChordLine(line, line);
        const chordText = trimmed;
        currentSection.lines.push({ lyrics: chordText, chords });
        i++;
      }
    } else {
      // Plain lyric line (no chords)
      currentSection.lines.push({ lyrics: trimmed, chords: [] });
      i++;
    }
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [{ label: 'Song', lines: [{ lyrics: text.trim(), chords: [] }] }];
}

/**
 * Detect if a text line is a tab-diagram line: |F  |-   |Gm  | - |
 */
function isTabLine(line: string): boolean {
  return line.includes('|') && (line.match(/\|/g) || []).length >= 2;
}

/**
 * Extract chord symbols from a tab line |F  |-   |Gm  | - |
 */
function parseTabLine(line: string): ChordPosition[] {
  const chords: ChordPosition[] = [];
  const cells = line.split('|').filter((c) => c.trim() && c.trim() !== '-');
  let pos = 0;
  for (const cell of cells) {
    const sym = cell.trim();
    if (sym && CHORD_PATTERN.test(sym)) {
      chords.push({ symbol: sym, position: pos });
      pos += sym.length + 2;
    }
  }
  return chords;
}

const CHORD_PATTERN = /^[A-G][b#]?(maj|min|m|M|aug|dim|sus|add|dom)?[0-9]*(\/[A-G][b#]?)?$/;

/**
 * Detect if a line is primarily chord symbols.
 * True if ≥ 60% of space-separated tokens match the chord pattern.
 */
function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const chordCount = tokens.filter((t) => CHORD_PATTERN.test(t)).length;
  return chordCount / tokens.length >= 0.6 && chordCount >= 1;
}

/**
 * Given a chord line and a lyrics line (both raw, preserving whitespace),
 * compute character-offset positions of each chord symbol relative to the lyrics line.
 *
 * ChordLanka aligns chords with spaces, so the column index of a chord in the
 * chord line equals the character position in the lyrics line where it should appear.
 */
function parseChordLine(chordLine: string, _lyricsLine: string): ChordPosition[] {
  const chords: ChordPosition[] = [];
  const regex = /[A-G][b#]?(maj|min|m|M|aug|dim|sus|add|dom)?[0-9]*(\/[A-G][b#]?)?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(chordLine)) !== null) {
    chords.push({ symbol: match[0], position: match.index });
  }
  return chords;
}

function formatSectionLabel(raw: string): string {
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
