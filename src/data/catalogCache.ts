import type { Catalog, Snapshot } from "./types";

export function refreshCatalog(
  previous: Snapshot | null,
  fresh: Snapshot,
  queueIds: string[] = [],
) {
  if (!previous?.profile || previous.profile.id !== fresh.profile?.id)
    return fresh;
  const merged = mergeCatalog(
    { ...fresh, catalog: previous.catalog },
    fresh.catalog,
    true,
    queueIds,
  );
  // The server owns membership/deletion of personal playlists and editorial feeds.
  return {
    ...merged,
    playlists: fresh.playlists,
    catalog: { ...merged.catalog, playlists: fresh.catalog.playlists },
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
  ) {
    const map = new Map(previous.map((item) => [item.id, item]));
    for (const item of next)
      if (detail || !map.has(item.id)) map.set(item.id, item);
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
      ),
    },
    playlists: merge(
      snapshot.playlists,
      incoming.playlists.filter((item) => item.owner),
      snapshot.playlists.map((item) => item.id),
    ),
  };
}
