import type { Catalog, Snapshot, Playlist } from "./types";

function playlistValue(previous: Playlist, incoming: Playlist): Playlist {
  return incoming.itemsComplete === false &&
    previous.itemsComplete !== false &&
    previous.revision === incoming.revision
    ? { ...incoming, items: previous.items, itemsComplete: true }
    : incoming;
}

export function refreshCatalog(
  previous: Snapshot | null,
  fresh: Snapshot,
  queueIds: string[] = [],
) {
  if (!previous?.profile || previous.profile.id !== fresh.profile?.id)
    return fresh;
  const merged = mergeCatalog(
    { ...fresh, catalog: previous.catalog, playlists: previous.playlists },
    {
      ...fresh.catalog,
      playlists: [...fresh.catalog.playlists, ...fresh.playlists],
    },
    true,
    queueIds,
  );
  // The server owns membership/deletion of personal playlists and editorial feeds.
  const owned = new Set(fresh.playlists.map((item) => item.id));
  const publicLists = new Set(fresh.catalog.playlists.map((item) => item.id));
  return {
    ...merged,
    playlists: merged.playlists.filter((item) => owned.has(item.id)),
    catalog: {
      ...merged.catalog,
      playlists: merged.catalog.playlists.filter((item) =>
        publicLists.has(item.id),
      ),
    },
  };
}

// Search summaries must not replace a loaded playlist's items or album order.
// Keep a bounded metadata working set and protect library/queue identities.
export function mergeCatalog(
  snapshot: Snapshot,
  incoming: Catalog,
  detail: boolean,
  queueIds: string[] = [],
): Snapshot {
  function merge<T extends { id: string }>(
    previous: T[],
    next: T[],
    protectedIds: string[] = [],
    reconcile?: (previous: T, incoming: T) => T,
  ) {
    const map = new Map(previous.map((item) => [item.id, item]));
    for (const item of next)
      if (detail || !map.has(item.id)) {
        const previous = map.get(item.id);
        map.set(
          item.id,
          previous && reconcile ? reconcile(previous, item) : item,
        );
      }
    const protectedSet = new Set(protectedIds);
    const values = [...map.values()];
    return [
      ...values.filter((item) => protectedSet.has(item.id)),
      ...values.filter((item) => !protectedSet.has(item.id)).slice(-5000),
    ];
  }
  return {
    ...snapshot,
    catalog: {
      tracks: merge(snapshot.catalog.tracks, incoming.tracks, [
        ...snapshot.library.tracks,
        ...queueIds,
      ]),
      artists: merge(
        snapshot.catalog.artists,
        incoming.artists,
        snapshot.library.artists,
      ),
      albums: merge(
        snapshot.catalog.albums,
        incoming.albums,
        snapshot.library.albums,
      ),
      playlists: merge(
        snapshot.catalog.playlists,
        incoming.playlists.filter((item) => !item.owner),
        snapshot.library.playlists,
        playlistValue,
      ),
    },
    playlists: merge(
      snapshot.playlists,
      incoming.playlists.filter((item) => item.owner),
      snapshot.playlists.map((item) => item.id),
      playlistValue,
    ),
  };
}
