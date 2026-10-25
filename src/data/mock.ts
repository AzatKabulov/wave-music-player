import { randomUUID } from "./uuid";
import catalog from "./catalog.json";
import type {
  MusicData,
  Playlist,
  QueueState,
  Snapshot,
  SearchResult,
} from "./types";
let snapshot: Snapshot = {
  profile: { id: "mock", displayName: "Listener" },
  catalog,
  library: { tracks: [], albums: [], playlists: [], artists: [] },
  preferences: { explicitAllowed: true, locale: "en", librarySort: "recent" },
  recents: [],
  playlists: [],
};
const queues = new Map<string, QueueState>();
export const mock: MusicData = {
  async search(query, kind, signal, cursor) {
    if (signal?.aborted) throw signal.reason;
    const needle = query.normalize("NFKC").toLocaleLowerCase();
    const results: SearchResult[] = [
      ...snapshot.catalog.tracks.map((item) => ({
        kind: "track" as const,
        item,
      })),
      ...snapshot.catalog.albums.map((item) => ({
        kind: "album" as const,
        item,
      })),
      ...snapshot.catalog.artists.map((item) => ({
        kind: "artist" as const,
        item,
      })),
      ...snapshot.catalog.playlists.map((item) => ({
        kind: "playlist" as const,
        item,
      })),
    ].filter(
      (result) =>
        (kind === "all" || result.kind === kind) &&
        ("title" in result.item ? result.item.title : result.item.name)
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(needle),
    );
    const offset = Number(cursor || 0);
    return {
      data: results.slice(offset, offset + 30),
      catalog: snapshot.catalog,
      nextCursor: results.length > offset + 30 ? String(offset + 30) : null,
      truncated: results.length > offset + 30,
    };
  },
  async resolve() {
    return structuredClone(snapshot.catalog);
  },
  async verify() {
    throw Error("Configure the account provider to verify email links.");
  },
  async updatePassword() {
    throw Error("Configure the account provider to reset your password.");
  },
  async snapshot() {
    return structuredClone(snapshot);
  },
  async auth(kind, email, password, displayName) {
    if (kind === "recover")
      return "Recovery will be connected with the account provider.";
    snapshot.profile = {
      id: "mock",
      displayName: displayName || "Listener",
      email,
    };
  },
  async signOut() {
    snapshot.profile = null;
  },
  async save(kind, id, saved) {
    snapshot.library[kind] = saved
      ? [...new Set([...snapshot.library[kind], id])]
      : snapshot.library[kind].filter((x) => x !== id);
  },
  async createPlaylist(title, description) {
    const p: Playlist = {
      id: randomUUID(),
      title,
      description,
      owner: true,
      palette: "sea",
      revision: "0",
      items: [],
    };
    snapshot.playlists.push(p);
    return p;
  },
  async editPlaylist(id, revision, title, description, items) {
    const p = snapshot.playlists.find((p) => p.id === id);
    if (!p) throw Error("Playlist not found");
    if (p.revision !== revision)
      throw Error("Playlist changed. Reload and try again.");
    Object.assign(p, {
      title,
      description,
      items,
      revision: String(BigInt(revision) + 1n),
    });
    return structuredClone(p);
  },
  async deletePlaylist(id) {
    snapshot.playlists = snapshot.playlists.filter((p) => p.id !== id);
  },
  async preferences(value) {
    snapshot.preferences = value;
  },
  async queue(id, state) {
    const previous = queues.get(id);
    if (previous && previous.revision !== state.revision)
      throw Error("Queue changed. Reload to continue.");
    const next = { ...state, revision: String(BigInt(state.revision) + 1n) };
    queues.set(id, next);
    return structuredClone(next);
  },
  async restoreQueue(id) {
    return queues.get(id) || null;
  },
  async grant() {
    return "mock";
  },
  media(_lease, entry) {
    return `/audio/${entry.trackId}.wav`;
  },
  async recent(id) {
    snapshot.recents = [id, ...snapshot.recents.filter((x) => x !== id)].slice(
      0,
      100,
    );
  },
  async deleteAccount() {
    snapshot = {
      ...snapshot,
      profile: null,
      library: { tracks: [], albums: [], artists: [], playlists: [] },
      playlists: [],
      recents: [],
    };
  },
};
