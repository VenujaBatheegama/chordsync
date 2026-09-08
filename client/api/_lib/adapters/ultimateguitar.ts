import axios from 'axios';
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

const httpClient = axios.create({
  timeout: 10_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    Referer: 'https://www.ultimate-guitar.com/',
    Cookie: 'ul_remember=1',
  },
});

// UG tab data types (subset we care about)
interface UGTabData {
  store?: {
    page?: {
      data?: {
        tab?: {
          song_name?: string;
          artist_name?: string;
          capo?: number | null;
          key?: string;
          tab_url?: string;
        };
        tab_view?: {
          wiki_tab?: {
            content?: string;
          };
        };
      };
      results?: Array<{
        song_name?: string;
        artist_name?: string;
        tab_url?: string;
        type?: string;
        rating?: number;
      }>;
    };
  };
}

export class UltimateGuitarAdapter implements SourceAdapter {
  async search(query: string): Promise<SearchResult[]> {
    try {
      await globalRateLimiter.throttle('ultimate_guitar');
      const searchUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query)}`;
      const response = await httpClient.get(searchUrl);
      const $ = cheerio.load(response.data as string);

      const storeDiv = $('div.js-store');
      if (!storeDiv.length) return [];

      const rawData = storeDiv.attr('data-content');
      if (!rawData) return [];

      const data: UGTabData = JSON.parse(decodeURIComponent(rawData));
      const results = data?.store?.page?.results || [];

      return results
        .filter((r) => r.type === 'Chords' && r.tab_url)
        .slice(0, 20)
        .map((r) => ({
          title: r.song_name || 'Unknown',
          artist: r.artist_name || 'Unknown',
          source: 'ultimate_guitar' as const,
          sourceUrl: r.tab_url!,
        }));
    } catch (err) {
      console.error('[UltimateGuitar] search error:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getChords(url: string): Promise<NormalizedSong> {
    await globalRateLimiter.throttle('ultimate_guitar');
    const response = await httpClient.get(url);
    const $ = cheerio.load(response.data as string);

    const storeDiv = $('div.js-store');
    if (!storeDiv.length) {
      throw new Error('Ultimate Guitar: could not find js-store data on page');
    }

    const rawData = storeDiv.attr('data-content');
    if (!rawData) {
      throw new Error('Ultimate Guitar: js-store data-content attribute is empty');
    }

    const data: UGTabData = JSON.parse(decodeURIComponent(rawData));
    const pageData = data?.store?.page?.data;

    if (!pageData) {
      throw new Error('Ultimate Guitar: no page data in js-store JSON');
    }

    const tab = pageData.tab || {};
    const title = tab.song_name || 'Unknown';
    const artist = tab.artist_name || 'Unknown';
    const key = tab.key || null;
    const capo = tab.capo ?? null;

    // The chord content is in wiki_tab.content — it uses [ch] markers for chords
    // Format: "[ch]G[/ch] [ch]D[/ch]\nLyric line here"
    const rawContent = pageData.tab_view?.wiki_tab?.content || '';
    const sections = parseUGContent(rawContent);

    return {
      title,
      artist,
      key,
      capo,
      sourceUrl: url,
      source: 'ultimate_guitar',
      sections,
    };
  }
}

/**
 * Parse Ultimate Guitar's wiki_tab content format.
 * Lines can be:
 * - [ch]Chord[/ch] lines (chord lines with position markers)
 * - [tab]...[/tab] blocks (tab notation, displayed as-is)
 * - [verse], [chorus], [bridge] etc. section markers
 * - Plain lyric text
 */
function parseUGContent(content: string): SongSection[] {
  const sections: SongSection[] = [];
  let currentSection: SongSection = { label: 'Verse', lines: [] };

  // Remove [tab] blocks (guitar tab notation — not chord+lyric)
  // We keep them as raw lyric lines so the user can see them
  const cleaned = content.replace(/\[tab\]/g, '').replace(/\[\/tab\]/g, '');

  const lines = cleaned.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Section header: [verse], [chorus], [bridge], [verse 2], etc.
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch && !/^ch$/.test(sectionMatch[1])) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        label: capitalize(sectionMatch[1]),
        lines: [],
      };
      i++;
      continue;
    }

    // Check if line contains [ch]...[/ch] tags (chord line)
    if (line.includes('[ch]')) {
      // Extract chord symbols and their positions in the plain text version of the line
      const chords = extractChordsFromUGLine(line);
      // Look ahead for the lyric line (next non-empty line that is NOT a chord line)
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      if (nextLine && !nextLine.includes('[ch]') && !nextLine.match(/^\[[^\]]+\]$/)) {
        currentSection.lines.push({ lyrics: nextLine, chords });
        i += 2;
      } else {
        // Chord line without a lyric below it — show chords as the lyric
        const chordText = line.replace(/\[ch\]|\[\/ch\]/g, '');
        currentSection.lines.push({ lyrics: chordText, chords });
        i++;
      }
      continue;
    }

    // Plain lyric line
    if (line.trim()) {
      currentSection.lines.push({ lyrics: line, chords: [] });
    }
    i++;
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [{ label: 'Song', lines: [] }];
}

/**
 * From a line like "  [ch]G[/ch]     [ch]D[/ch]  [ch]Em[/ch]",
 * extract chords with their character positions in the stripped line.
 */
function extractChordsFromUGLine(line: string): ChordPosition[] {
  const chords: ChordPosition[] = [];
  // We need to track position in the "display" string (without [ch] tags)
  let displayOffset = 0;
  let searchPos = 0;

  while (searchPos < line.length) {
    const chStart = line.indexOf('[ch]', searchPos);
    if (chStart === -1) break;

    // Characters before [ch] contribute to display offset
    displayOffset += chStart - searchPos;

    const chEnd = line.indexOf('[/ch]', chStart);
    if (chEnd === -1) break;

    const symbol = line.substring(chStart + 4, chEnd);
    chords.push({ symbol, position: displayOffset });

    displayOffset += symbol.length;
    searchPos = chEnd + 5; // skip past [/ch]
  }

  return chords;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
