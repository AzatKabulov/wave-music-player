import type { Snapshot } from "./types";

export const snapshotCacheKey = "musify.bootstrap.v1";
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const id = (value: unknown) =>
  text(value) && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const ids = (value: unknown) => Array.isArray(value) && value.every(id);
const rows = (value: unknown, valid: (row: unknown) => boolean) =>
  Array.isArray(value) && value.every(valid);
const named = (value: unknown, field: string) =>
  record(value) && id(value.id) && text(value[field]);
const track = (value: unknown) =>
  record(value) &&
  named(value, "title") &&
  id(value.artistId) &&
  text(value.artist) &&
  text(value.album) &&
  (value.albumId === "" || id(value.albumId)) &&
  typeof value.available === "boolean" &&
  typeof value.explicit === "boolean" &&
  Number.isSafeInteger(value.durationMs) &&
  Number(value.durationMs) > 0 &&
  Number(value.durationMs) <= 7200000 &&
  text(value.genre) &&
  text(value.language);
const album = (value: unknown) =>
  record(value) &&
  named(value, "title") &&
  text(value.artist) &&
  (value.year == null || Number.isInteger(value.year)) &&
  ids(value.trackIds);
const artist = (value: unknown) =>
  record(value) && named(value, "name") && text(value.bio);
const playlist = (value: unknown) =>
  record(value) &&
  named(value, "title") &&
  text(value.description) &&
  typeof value.owner === "boolean" &&
  text(value.revision) &&
  /^(0|[1-9][0-9]{0,18})$/.test(value.revision) &&
  rows(
    value.items,
    (item) => record(item) && id(item.id) && id(item.trackId),
  ) &&
  (value.itemsComplete === undefined ||
    typeof value.itemsComplete === "boolean") &&
  (value.hasRecordings === undefined ||
    typeof value.hasRecordings === "boolean") &&
  (value.trackCount === undefined ||
    (Number.isSafeInteger(value.trackCount) &&
      Number(value.trackCount) >= (value.items as unknown[]).length)) &&
  (value.itemsComplete !== false || value.trackCount !== undefined);
function validSnapshot(value: unknown): value is Snapshot {
  if (
    !record(value) ||
    !record(value.profile) ||
    !id(value.profile.id) ||
    !text(value.profile.displayName) ||
    !record(value.catalog) ||
    !record(value.library) ||
    !record(value.preferences)
  )
    return false;
  const library = value.library;
  return (
    rows(value.catalog.tracks, track) &&
    rows(value.catalog.albums, album) &&
    rows(value.catalog.artists, artist) &&
    rows(value.catalog.playlists, playlist) &&
    rows(value.playlists, playlist) &&
    ["tracks", "albums", "artists", "playlists"].every((kind) =>
      ids(library[kind]),
    ) &&
    ids(value.recents) &&
    (value.libraryEntries === undefined ||
      rows(
        value.libraryEntries,
        (entry) =>
          record(entry) &&
          id(entry.id) &&
          ["tracks", "albums", "artists", "playlists"].includes(
            String(entry.kind),
          ) &&
          text(entry.addedAt) &&
          Number.isFinite(Date.parse(entry.addedAt)) &&
          (entry.pinnedAt === undefined ||
            (text(entry.pinnedAt) &&
              Number.isFinite(Date.parse(entry.pinnedAt)))),
      )) &&
    typeof value.preferences.explicitAllowed === "boolean" &&
    text(value.preferences.locale) &&
    ["recent", "title", "creator"].includes(
      String(value.preferences.librarySort),
    )
  );
}
function byteLength(value: string) {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

// Disposable metadata only: one session-scoped record, a byte quota and a TTL.
// Never contains auth credentials, media grants, downloaded audio or queue URLs.
export function createSnapshotCache(
  storage: Storage,
  {
    now = Date.now,
    ttlMs = 24 * 60 * 60 * 1000,
    maxBytes = 2 * 1024 * 1024,
  }: { now?: () => number; ttlMs?: number; maxBytes?: number } = {},
) {
  let tail: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>, fallback: T): Promise<T> {
    const next = tail.then(work).catch(() => fallback);
    tail = next.then(() => {});
    return next;
  }
  const erase = async () => {
    await storage.setItem(snapshotCacheKey, "");
    return null;
  };
  return {
    clear() {
      return serial(async () => {
        await erase();
      }, undefined);
    },
    read(scope: string): Promise<Snapshot | null> {
      return serial(async () => {
        if (!/^[a-f0-9]{64}$/.test(scope)) return erase();
        const raw = await storage.getItem(snapshotCacheKey);
        if (!raw) return null;
        if (raw.length > maxBytes || byteLength(raw) > maxBytes) return erase();
        let entry: unknown;
        try {
          entry = JSON.parse(raw);
        } catch {
          return erase();
        }
        if (
          !record(entry) ||
          entry.version !== 1 ||
          entry.scope !== scope ||
          !Number.isSafeInteger(entry.savedAt) ||
          Number(entry.savedAt) > now() + 60000 ||
          now() - Number(entry.savedAt) > ttlMs ||
          !validSnapshot(entry.snapshot) ||
          entry.ownerId !== entry.snapshot.profile?.id
        )
          return erase();
        return entry.snapshot;
      }, null);
    },
    write(scope: string, value: Snapshot): Promise<boolean> {
      return serial(async () => {
        if (!/^[a-f0-9]{64}$/.test(scope) || !validSnapshot(value)) {
          await erase();
          return false;
        }
        const snapshot: Snapshot = {
          profile: {
            id: value.profile!.id,
            displayName: value.profile!.displayName,
          },
          catalog: value.catalog,
          library: value.library,
          libraryEntries: value.libraryEntries?.map((entry) => ({
            kind: entry.kind,
            id: entry.id,
            addedAt: entry.addedAt,
            ...(entry.pinnedAt ? { pinnedAt: entry.pinnedAt } : {}),
          })),
          preferences: value.preferences,
          recents: value.recents,
          playlists: value.playlists,
          hideFixtures: value.hideFixtures,
          demoEnabled: value.demoEnabled,
          accountProvider: value.accountProvider,
        };
        const raw = JSON.stringify({
          version: 1,
          scope,
          ownerId: value.profile!.id,
          savedAt: now(),
          snapshot,
        });
        if (byteLength(raw) > maxBytes) {
          await erase();
          return false;
        }
        await storage.setItem(snapshotCacheKey, raw);
        return true;
      }, false);
    },
  };
}
