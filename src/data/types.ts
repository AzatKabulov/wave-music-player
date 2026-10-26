export type Artist = {
  id: string;
  name: string;
  palette: string;
  bio: string;
  aliases?: string[];
  bioSource?: string | null;
  artworkUrl?: string;
  artworkColor?: string;
};
export type Track = {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  albumId: string;
  album: string;
  palette: string;
  durationMs: number;
  genre: string;
  language: string;
  explicit: boolean;
  available: boolean;
  artworkUrl?: string;
  artworkColor?: string;
  contentKind?: "recording" | "fixture";
  explicitState?: "unknown" | "clean" | "explicit";
  version?: string | null;
  discNumber?: number;
  trackNumber?: number;
};
export type Album = {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  palette: string;
  year: number;
  trackIds: string[];
  artworkUrl?: string;
  artworkColor?: string;
  releaseType?: "album" | "ep" | "single" | "compilation" | "unknown";
  releaseDate?: string | null;
  edition?: string | null;
  expectedTrackCount?: number | null;
  completeness?: "unknown" | "partial" | "complete";
};
export type PlaylistItem = { id: string; trackId: string };
export type Playlist = {
  id: string;
  title: string;
  description: string;
  palette: string;
  owner: boolean;
  revision: string;
  items: PlaylistItem[];
  artworkUrl?: string;
  artworkColor?: string;
};
export type Library = {
  tracks: string[];
  albums: string[];
  playlists: string[];
  artists: string[];
};
export type QueueEntry = PlaylistItem & { origin: "context" | "explicit" };
export type QueueState = {
  revision: string;
  entries: QueueEntry[];
  currentId: string | null;
  positionMs: number;
  repeat: "none" | "all" | "single";
  shuffle: boolean;
};
export type Profile = { id: string; displayName: string; email?: string };
export type Preferences = {
  explicitAllowed: boolean;
  locale: string;
  librarySort: "recent" | "title" | "creator";
};
export type Catalog = {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
};
export type SearchKind = "all" | "track" | "album" | "artist" | "playlist";
export type SearchResult =
  | { kind: "track"; item: Track }
  | { kind: "album"; item: Album }
  | { kind: "artist"; item: Artist }
  | { kind: "playlist"; item: Playlist };
export type SearchPage = {
  data: SearchResult[];
  catalog: Catalog;
  nextCursor: string | null;
  truncated: boolean;
};
export type Snapshot = {
  hideFixtures?: boolean;
  profile: Profile | null;
  catalog: Catalog;
  library: Library;
  preferences: Preferences;
  recents: string[];
  playlists: Playlist[];
  demoEnabled?: boolean;
  accountProvider?: "local" | "supabase";
};
export interface MusicData {
  cachedSnapshot(): Promise<Snapshot | null>;
  search(
    query: string,
    kind: SearchKind,
    signal?: AbortSignal,
    cursor?: string,
  ): Promise<SearchPage>;
  resolve(kind: "album" | "artist" | "playlist", id: string): Promise<Catalog>;
  snapshot(): Promise<Snapshot>;
  auth(
    kind: "login" | "register" | "recover",
    email: string,
    password: string,
    displayName: string,
  ): Promise<string | void>;
  signOut(): Promise<void>;
  save(kind: keyof Library, id: string, saved: boolean): Promise<void>;
  createPlaylist(
    title: string,
    description: string,
    requestKey: string,
  ): Promise<Playlist>;
  editPlaylist(
    id: string,
    revision: string,
    title: string,
    description: string,
    items: PlaylistItem[],
  ): Promise<Playlist>;
  deletePlaylist(id: string, revision: string): Promise<void>;
  preferences(value: Preferences): Promise<void>;
  queue(installationId: string, state: QueueState): Promise<QueueState>;
  position(installationId: string, state: QueueState): Promise<boolean>;
  restoreQueue(installationId: string): Promise<QueueState | null>;
  grant(installationId: string): Promise<string>;
  media(lease: string, entry: QueueEntry): string;
  recent(trackId: string): Promise<void>;
  deleteAccount(): Promise<void>;
  verify(tokenHash: string, type: "recovery" | "email"): Promise<void>;
  updatePassword(password: string): Promise<void>;
}
