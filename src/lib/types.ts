// Shared client-side types mirroring server types

export interface SearchResult {
  title: string;
  artist: string;
  source: 'chordlanka' | 'ultimate_guitar';
  sourceUrl: string;
  thumbnail?: string;
}

export interface ChordPosition {
  symbol: string;
  position: number;
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

export interface PlaylistItem {
  id: string;
  playlistId: string;
  source: string;
  sourceUrl: string;
  title: string;
  artist: string;
  position: number;
  addedBy: string;
  addedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  ownerId: string;
  shareCode: string;
  createdAt: string;
  items: PlaylistItem[];
  owner?: { name: string };
  _count?: { items: number };
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
