// Shared types used across the server

export interface SearchResult {
  title: string;
  artist: string;
  source: 'chordlanka' | 'ultimate_guitar';
  sourceUrl: string;
  thumbnail?: string;
}

export interface ChordPosition {
  symbol: string;
  position: number; // character offset into lyrics string
}

export interface LyricLine {
  lyrics: string;
  chords: ChordPosition[];
}

export interface SongSection {
  label: string;
  lines: LyricLine[];
}

export interface NormalizedSong {
  title: string;
  artist: string;
  key: string | null;
  capo: number | null;
  sourceUrl: string;
  source: 'chordlanka' | 'ultimate_guitar';
  sections: SongSection[];
}

export interface SourceAdapter {
  search(query: string): Promise<SearchResult[]>;
  getChords(url: string): Promise<NormalizedSong>;
}

export interface SessionState {
  playlistId: string;
  shareCode: string;
  currentItemId: string | null;
  scrollPercent: number;
  transposeOffset: number;
  leaderUserId: string | null;
  leaderUserName: string | null;
}
